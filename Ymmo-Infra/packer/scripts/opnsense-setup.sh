#!/bin/sh

echo ">>> Configuration finale d'OPNsense..."

if [ -z "$AUTH_KEYS_B64" ]; then
    echo ">>> ERREUR CRITIQUE : La variable AUTH_KEYS_B64 est vide !"
    exit 1
fi

# ─────────────────────────────────────────────────────────────────
# Configuration via l'API PHP interne d'OPNsense
# (la SEULE manière fiable : OPNsense ecrase tout ce qu'on ecrit
#  directement sur le filesystem au boot via local_sync_accounts())
# ─────────────────────────────────────────────────────────────────
echo ">>> Application de la configuration via config.xml..."
php -r '
require_once("util.inc");
require_once("config.inc");
global $config;

$auth_keys_b64 = getenv("AUTH_KEYS_B64");

// 1. Marqueur wizard + clavier
$config["system"]["wizard_done"] = "yes";
$config["system"]["keymap"] = "fr.iso";

// 2. SSH : activer le daemon et autoriser le login root par cle
//    OPNsense lit ces valeurs pour generer sshd_config au boot.
//    Valeur non-vide = actif.
$config["system"]["ssh"]["enabled"] = "enabled";
$config["system"]["ssh"]["permitrootlogin"] = "yes";

// 3. Injection des cles SSH dans le user root
//    OPNsense stocke les cles en base64 dans <authorizedkeys>.
//    Au boot, local_sync_accounts() fait base64_decode() puis
//    ecrit le resultat dans ~/.ssh/authorized_keys.
//    AUTH_KEYS_B64 = base64(key1\nkey2\n...) => format exact attendu.
$users = &$config["system"]["user"];

// Gerer les deux cas possibles : user unique (tableau plat) ou liste
if (isset($users["name"])) {
    // Un seul utilisateur dans config.xml
    if ($users["name"] === "root") {
        $users["authorizedkeys"] = $auth_keys_b64;
    }
} else {
    // Plusieurs utilisateurs
    foreach ($users as &$user) {
        if (isset($user["name"]) && $user["name"] === "root") {
            $user["authorizedkeys"] = $auth_keys_b64;
            break;
        }
    }
    unset($user);
}

// 4. Interfaces (alignement avec Terraform)
// LAN => vtnet0
$config["interfaces"]["lan"]["if"]     = "vtnet0";
$config["interfaces"]["lan"]["enable"] = "1";
$config["interfaces"]["lan"]["ipaddr"] = "192.168.1.1";
$config["interfaces"]["lan"]["subnet"] = "24";

// WAN => vtnet1 en DHCP
$config["interfaces"]["wan"]["if"]     = "vtnet1";
$config["interfaces"]["wan"]["enable"] = "1";
$config["interfaces"]["wan"]["ipaddr"] = "dhcp";

// Pas de blocage IP privees/bogons sur le WAN (pratique pour Proxmox)
unset($config["interfaces"]["wan"]["blockpriv"]);
unset($config["interfaces"]["wan"]["blockbogons"]);

// 5. Injection des credentials API OPNsense
//    Permet a Ansible de piloter OPNsense via REST des le premier boot.
//    Le secret est hashe en SHA-512 ($6$) : format attendu par OPNsense 26.1.
//    Si les variables ne sont pas fournies, on passe sans erreur.
$api_key    = getenv("OPN_API_KEY");
$api_secret = getenv("OPN_API_SECRET");

if (!empty($api_key) && !empty($api_secret)) {
    // Hash SHA-512 avec sel aleatoire (format $6$ de crypt)
    $salt          = bin2hex(random_bytes(8));
    $hashed_secret = crypt($api_secret, "\$6\$" . $salt . "\$");

    // Localiser le user root (meme logique que pour les cles SSH ci-dessus)
    $users = &$config["system"]["user"];
    if (isset($users["name"])) {
        // Un seul utilisateur dans config.xml
        if ($users["name"] === "root") {
            // apikeys peut etre une chaine vide si absent du XML (PHP 8 strict)
            if (!is_array($users["apikeys"])) {
                $users["apikeys"] = [];
            }
            if (!isset($users["apikeys"]["item"])) {
                $users["apikeys"]["item"] = [];
            }
            $users["apikeys"]["item"][] = ["key" => $api_key, "secret" => $hashed_secret];
        }
    } else {
        // Plusieurs utilisateurs
        foreach ($users as &$user) {
            if (isset($user["name"]) && $user["name"] === "root") {
                // apikeys peut etre une chaine vide si absent du XML (PHP 8 strict)
                if (!is_array($user["apikeys"])) {
                    $user["apikeys"] = [];
                }
                if (!isset($user["apikeys"]["item"])) {
                    $user["apikeys"]["item"] = [];
                }
                $user["apikeys"]["item"][] = ["key" => $api_key, "secret" => $hashed_secret];
                break;
            }
        }
        unset($user);
    }
}

// 6. Regle firewall WAN : autoriser l acces a l API depuis le reseau de gestion
//    Sans cette regle, OPNsense bloque tout le trafic entrant sur le WAN par defaut.
//    Ansible (connection: local) doit pouvoir joindre l API HTTPS depuis l exterieur.
if (!isset($config["filter"]["rule"]) || !is_array($config["filter"]["rule"])) {
    $config["filter"]["rule"] = [];
}

// Ajout en premier pour etre evalue avant les regles de blocage generiques
array_unshift($config["filter"]["rule"], [
    "type"        => "pass",
    "interface"   => "wan",
    "ipprotocol"  => "inet",
    "statetype"   => "keep state",
    "protocol"    => "tcp",
    "source"      => ["any" => ""],
    "destination" => ["network" => "(self)", "port" => "443"],
    "descr"       => "Ansible-API-WAN",
    "tracker"     => "1000000001",
    "created"     => ["time" => (string)time(), "username" => "root@local"],
]);

// 7. Regles pass legacy pour chaque VLAN Siege (opt1-opt4).
//    OPNsense bloque tout trafic entrant sur les interfaces OPT par defaut.
//    L API automation (oxlorg.opnsense.rule) cree des regles dans "Rules from Automation"
//    qui apparaissent dans l UI mais ne sont pas evaluees si le toggle d interface
//    n est pas actif. On bake ici les memes regles en tant que regles legacy (config.xml)
//    pour garantir qu elles soient dans le packet filter des le premier boot.
$vlan_pass_rules = [
    ["opt" => "opt1", "network" => "10.0.10.0/24", "name" => "SRV_SIEGE", "tracker" => "1000000010"],
    ["opt" => "opt2", "network" => "10.0.20.0/24", "name" => "USR_SIEGE", "tracker" => "1000000011"],
    ["opt" => "opt3", "network" => "10.0.30.0/24", "name" => "PRT_SIEGE", "tracker" => "1000000012"],
    ["opt" => "opt4", "network" => "10.0.99.0/24", "name" => "MGT_SIEGE", "tracker" => "1000000013"],
];
foreach ($vlan_pass_rules as $r) {
    // Note : pas de cle "protocol" — omettre = tous protocoles en pf FreeBSD.
    // "protocol" => "any" genere "proto any" qui est invalide dans pf et fait
    // echouer silencieusement toute la compilation du ruleset.
    $config["filter"]["rule"][] = [
        "type"        => "pass",
        "interface"   => $r["opt"],
        "ipprotocol"  => "inet",
        "statetype"   => "keep state",
        "source"      => ["network" => $r["network"]],
        "destination" => ["any" => ""],
        "descr"       => "Allow-" . $r["name"] . "-to-WAN",
        "tracker"     => $r["tracker"],
        "created"     => ["time" => (string)time(), "username" => "root@local"],
    ];
}

// Regle floating : backbone WireGuard (10.254.0.0/24) -> VLANs Siege (10.0.0.0/16).
// L API OPNsense ne peut pas creer de vraies regles floating (issue #6938),
// donc on l injecte ici directement dans config.xml via PHP.
// "floating" => "yes" + "interface" => "" = regle evaluee sur toutes les interfaces.
// Note : pas de cle "protocol" — "protocol" => "any" genere "proto any" invalide en pf.
$config["filter"]["rule"][] = [
    "type"        => "pass",
    "interface"   => "",
    "floating"    => "yes",
    "direction"   => "in",
    "quick"       => "1",
    "ipprotocol"  => "inet",
    "source"      => ["network" => "10.254.0.0/24"],
    "destination" => ["network" => "10.0.0.0/16"],
    "descr"       => "Allow-WireGuard-backbone-to-VLANs-siege",
    "tracker"     => "1000000002",
    "created"     => ["time" => (string)time(), "username" => "root@local"],
];

// 8. NAT outbound : mode hybride + regles explicites par VLAN Siege.
//    L API REST OPNsense n expose pas le NAT outbound (code legacy).
//    On injecte directement dans config.xml, comme pour la regle floating.
//    Mode "hybrid" : les regles explicites ci-dessous s appliquent en
//    complement des regles automatiques generees par OPNsense.
if (!isset($config["nat"])) {
    $config["nat"] = [];
}
if (!isset($config["nat"]["outbound"])) {
    $config["nat"]["outbound"] = [];
}
$config["nat"]["outbound"]["mode"] = "hybrid";

if (!isset($config["nat"]["outbound"]["rule"]) || !is_array($config["nat"]["outbound"]["rule"])) {
    $config["nat"]["outbound"]["rule"] = [];
}
$vlan_nat = [
    ["10.0.10.0/24", "SRV_SIEGE"],
    ["10.0.20.0/24", "USR_SIEGE"],
    ["10.0.30.0/24", "PRT_SIEGE"],
    ["10.0.99.0/24", "MGT_SIEGE"],
];
foreach ($vlan_nat as [$subnet, $name]) {
    $config["nat"]["outbound"]["rule"][] = [
        "interface"       => "wan",
        "source"          => ["network" => $subnet],
        "destination"     => ["any" => ""],
        "target"          => "",
        "targetip"        => "",
        "targetip_subnet" => "32",
        "staticnatport"   => "0",
        "nosync"          => "0",
        "descr"           => "NAT-" . $name . "-to-WAN",
        "created"         => ["time" => (string)time(), "username" => "root@local"],
    ];
}

// 9. Port-forward (DNAT) : exposer la webapp Ymmo sur le WAN (acces depuis le PC fixe).
//    L API REST OPNsense n expose pas les port-forwards (code legacy, comme le NAT
//    outbound), on bake donc directement dans config.xml.
//    Source 192.168.10.0/24 (reseau lab) -> WAN:8080  ==DNAT==>  10.0.10.2:80 (frontend nginx).
//    "associated-rule-id" => "pass" : OPNsense genere automatiquement la regle de
//    filtrage WAN correspondante (sinon le trafic traduit serait bloque par defaut).
if (!isset($config["nat"]["rule"]) || !is_array($config["nat"]["rule"])) {
    $config["nat"]["rule"] = [];
}
$config["nat"]["rule"][] = [
    "interface"          => "wan",
    "ipprotocol"         => "inet",
    "protocol"           => "tcp",
    "source"             => ["network" => "192.168.10.0/24"],
    "destination"        => ["network" => "wanip", "port" => "8080"],
    "target"             => "10.0.10.2",
    "local-port"         => "80",
    "descr"              => "Webapp-PortForward-WAN",
    "associated-rule-id" => "pass",
    "created"            => ["time" => (string)time(), "username" => "root@local"],
];

// 7. Pre-declaration des VLANs et interfaces OPT du Siege
//    L API OPNsense n expose pas l assignation d interfaces (issue core#7324,
//    fermee "not planned"). On ecrit directement dans config.xml.
//    Ansible (role opnsense_network) configurera DHCP et firewall par API.
$siege_vlans = [
    ["tag" => 10, "name" => "SRV_SIEGE", "ip" => "10.0.10.254", "opt" => "opt1"],
    ["tag" => 20, "name" => "USR_SIEGE", "ip" => "10.0.20.254", "opt" => "opt2"],
    ["tag" => 30, "name" => "PRT_SIEGE", "ip" => "10.0.30.254", "opt" => "opt3"],
    ["tag" => 99, "name" => "MGT_SIEGE", "ip" => "10.0.99.254", "opt" => "opt4"],
];

if (!isset($config["vlans"]) || !is_array($config["vlans"])) {
    $config["vlans"] = ["vlan" => []];
}
if (!isset($config["vlans"]["vlan"]) || !is_array($config["vlans"]["vlan"])) {
    $config["vlans"]["vlan"] = [];
}

foreach ($siege_vlans as $v) {
    $vlanif = "vlan0." . $v["tag"];

    // "vlanif" force le nom du device OS (ex: vlan0.10) — sans cet attribut,
    // OPNsense genere un nom sequentiel (vlan01, vlan02...) depuis la v22.1.6.
    $config["vlans"]["vlan"][] = [
        "if"     => "vtnet0",
        "tag"    => (string)$v["tag"],
        "pcp"    => "0",
        "proto"  => "",
        "descr"  => $v["name"],
        "vlanif" => $vlanif,
    ];

    // Interface OPT : assignee sur le device VLAN avec son IP de passerelle.
    $config["interfaces"][$v["opt"]] = [
        "if"        => $vlanif,
        "descr"     => $v["name"],
        "enable"    => "1",
        "spoofmac"  => "",
        "ipaddr"    => $v["ip"],
        "subnet"    => "24",
        "ipaddrv6"  => "",
        "subnetv6"  => "",
    ];
}

write_config("Packer: cles SSH root, SSH daemon, interfaces, wizard, cles API, regle WAN, pass rules VLANs, floating WireGuard, NAT outbound hybrid, port-forward Webapp, VLANs Siege");
echo "config.xml sauvegarde avec succes.\n";
'

# Verifier que PHP n'a pas plante
if [ $? -ne 0 ]; then
    echo ">>> ERREUR : Le bloc PHP a echoue !"
    exit 1
fi

# ─────────────────────────────────────────────────────────────────
# Validation des credentials API OPNsense
# Effectuee uniquement si les variables sont fournies
# ─────────────────────────────────────────────────────────────────
if [ -n "$OPN_API_KEY" ] && [ -n "$OPN_API_SECRET" ]; then
    echo ">>> Validation des credentials API OPNsense..."
    HTTP_CODE=$(curl -k -s -o /dev/null -w "%{http_code}" \
      -u "${OPN_API_KEY}:${OPN_API_SECRET}" \
      https://127.0.0.1/api/core/firmware/status)
    if [ "$HTTP_CODE" != "200" ]; then
        echo ">>> ERREUR : Les credentials API sont invalides (HTTP ${HTTP_CODE})"
        exit 1
    fi
    echo ">>> Credentials API valides (HTTP 200)."
fi

# ─────────────────────────────────────────────────────────────────
# Clavier AZERTY au niveau FreeBSD rc.conf (complementaire)
# ─────────────────────────────────────────────────────────────────
echo ">>> Activation du clavier AZERTY permanent (rc.conf)..."
sysrc keymap="fr.iso"

# ─────────────────────────────────────────────────────────────────
# Nettoyage du cache pkg
# ─────────────────────────────────────────────────────────────────
echo ">>> Nettoyage du cache pkg..."
pkg clean -y

echo ">>> Configuration OPNsense terminee avec succes."
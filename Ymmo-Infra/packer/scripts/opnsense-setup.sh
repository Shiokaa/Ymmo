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

write_config("Packer: cles SSH root, SSH daemon, interfaces, wizard, cles API, regle WAN, VLANs Siege");
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
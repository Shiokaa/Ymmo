package com.ymmo.services;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

@Service
public class FileUploadService {
    private static final String UPLOAD_DIR = System.getProperty("user.dir") + "/uploads/";

    public String fileUpload(MultipartFile file) {
        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || originalFilename.isBlank()) {
            throw new IllegalArgumentException("Nom de fichier invalide");
        }

        String extension = StringUtils.getFilenameExtension(originalFilename);
        if (extension == null || !List.of("jpeg", "jpg", "png").contains(extension.toLowerCase())) {
            throw new IllegalArgumentException("Extension invalide");
        }

        UUID uuid = UUID.randomUUID();
        String newFileName = uuid + "." + extension;

        try {
            Path uploadPath = Paths.get(UPLOAD_DIR);
            if (!Files.exists(uploadPath)) {
                Files.createDirectory(uploadPath);
            }

            Path filePath = uploadPath.resolve(newFileName);
            file.transferTo(filePath.toFile());

        } catch (IOException | IllegalStateException e) {
            throw new IllegalArgumentException();
        }

        return newFileName;
    }
}

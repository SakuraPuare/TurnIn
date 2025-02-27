-- CreateTable
CREATE TABLE `Admin` (
    `id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Admin_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `Admin` (`id`, `username`, `password`, `createdAt`, `updatedAt`) VALUES ('1', 'admin', 'admin123', '2025-02-27 04:22:45', '2025-02-27 04:22:45');

-- CreateTable
CREATE TABLE `Class` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Class_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Student` (
    `id` VARCHAR(191) NOT NULL,
    `studentId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `classId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Student_studentId_key`(`studentId`),
    UNIQUE INDEX `Student_classId_studentId_key`(`classId`, `studentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Assignment` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `deadline` DATETIME(3) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `fileNameFormat` VARCHAR(191) NOT NULL DEFAULT '{studentId}_{assignmentTitle}',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RequiredField` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'text',
    `description` VARCHAR(191) NULL,
    `options` VARCHAR(191) NULL,
    `required` BOOLEAN NOT NULL DEFAULT true,
    `assignmentId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Submission` (
    `id` VARCHAR(191) NOT NULL,
    `assignmentId` VARCHAR(191) NOT NULL,
    `studentId` VARCHAR(191) NOT NULL,
    `fileUrl` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `formData` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Submission_assignmentId_studentId_key`(`assignmentId`, `studentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_ClassToAssignment` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_ClassToAssignment_AB_unique`(`A`, `B`),
    INDEX `_ClassToAssignment_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Student` ADD CONSTRAINT `Student_classId_fkey` FOREIGN KEY (`classId`) REFERENCES `Class`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RequiredField` ADD CONSTRAINT `RequiredField_assignmentId_fkey` FOREIGN KEY (`assignmentId`) REFERENCES `Assignment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Submission` ADD CONSTRAINT `Submission_assignmentId_fkey` FOREIGN KEY (`assignmentId`) REFERENCES `Assignment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Submission` ADD CONSTRAINT `Submission_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `Student`(`studentId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_ClassToAssignment` ADD CONSTRAINT `_ClassToAssignment_A_fkey` FOREIGN KEY (`A`) REFERENCES `Assignment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_ClassToAssignment` ADD CONSTRAINT `_ClassToAssignment_B_fkey` FOREIGN KEY (`B`) REFERENCES `Class`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Class`
    MODIFY `description` TEXT NULL;

ALTER TABLE `Assignment`
    MODIFY `description` TEXT NULL;

ALTER TABLE `RequiredField`
    MODIFY `description` TEXT NULL,
    MODIFY `options` TEXT NULL;

ALTER TABLE `Submission`
    MODIFY `notes` TEXT NULL,
    MODIFY `formData` TEXT NULL;

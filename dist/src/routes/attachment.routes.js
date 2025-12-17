"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const attachment_controller_1 = require("../controllers/attachment.controller");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const upload_middleware_1 = require("../middleware/upload.middleware");
const attachment_validator_1 = require("../validators/attachment.validator");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticate);
// Task attachments routes
router.post('/tasks/:taskId', (0, validation_1.validate)(attachment_validator_1.taskAttachmentsSchema), (0, validation_1.validate)(attachment_validator_1.uploadAttachmentSchema), upload_middleware_1.upload.array('files', 5), // Max 5 files
attachment_controller_1.uploadAttachment);
router.get('/tasks/:taskId', (0, validation_1.validate)(attachment_validator_1.taskAttachmentsSchema), attachment_controller_1.getTaskAttachments);
// User attachments
router.get('/user', attachment_controller_1.getUserAttachments);
// Single attachment routes
router.get('/:id', (0, validation_1.validate)(attachment_validator_1.attachmentIdSchema), attachment_controller_1.getAttachment);
router.put('/:id', (0, validation_1.validate)(attachment_validator_1.attachmentIdSchema), (0, validation_1.validate)(attachment_validator_1.updateAttachmentSchema), attachment_controller_1.updateAttachment);
router.delete('/:id', (0, validation_1.validate)(attachment_validator_1.attachmentIdSchema), attachment_controller_1.deleteAttachment);
router.get('/:id/download', (0, validation_1.validate)(attachment_validator_1.attachmentIdSchema), attachment_controller_1.downloadAttachment);
router.get('/:id/preview', (0, validation_1.validate)(attachment_validator_1.attachmentIdSchema), attachment_controller_1.previewAttachment);
exports.default = router;
//# sourceMappingURL=attachment.routes.js.map
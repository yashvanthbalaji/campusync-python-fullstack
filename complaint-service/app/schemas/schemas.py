from marshmallow import Schema, fields

class ComplaintResponseSchema(Schema):
    id = fields.Int()
    studentEmail = fields.Str()
    studentName = fields.Str()
    roomNumber = fields.Str()
    title = fields.Str()
    description = fields.Str()
    category = fields.Str()
    status = fields.Str()
    imagePath = fields.Str()
    timeOfDay = fields.Str()
    createdAt = fields.Str()
    updatedAt = fields.Str()
    resolvedAt = fields.Str()
    resolvedByWorker = fields.Str()
    workerNote = fields.Str()
    workType = fields.Str()
    assignedWorkerEmail = fields.Str()
    assignedWorkerName = fields.Str()

class ComplaintRequestSchema(Schema):
    title = fields.Str(required=True)
    description = fields.Str(required=True)
    category = fields.Str(load_default='OTHER')
    roomNumber = fields.Str(load_default='')
    timeOfDay = fields.Str(load_default='')

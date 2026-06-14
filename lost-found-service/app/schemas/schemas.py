from marshmallow import Schema, fields, post_dump


class LostFoundResponseSchema(Schema):
    """Response schema — mirrors LostFoundItem.to_dict() with camelCase keys."""
    id = fields.Integer()
    reporterEmail = fields.String()
    reporterName = fields.String()
    reporterPhone = fields.String()
    itemName = fields.String()
    description = fields.String()
    type = fields.String()
    priority = fields.String()
    locationCategory = fields.String()
    locationFloor = fields.String()
    matchStatus = fields.String()
    matchedWithId = fields.Integer(allow_none=True)
    imageUrl = fields.String()
    aiDescription = fields.String()
    status = fields.String()
    itemStatus = fields.String()
    createdAt = fields.String()


class LostFoundRequestSchema(Schema):
    """Validates multipart form fields for creating/updating a lost-found item."""
    itemName = fields.String(required=True)
    description = fields.String(load_default='')
    type = fields.String(required=True)
    priority = fields.String(required=True)
    locationCategory = fields.String(required=True)
    locationFloor = fields.String(required=True)

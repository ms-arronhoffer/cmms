import Joi from 'joi';

export const loginSchema = Joi.object({
  username: Joi.string().trim().required(),
  password: Joi.string().min(8).required(),
});

export const userSchema = Joi.object({
  username: Joi.string().trim().min(3).required(),
  password: Joi.string().min(8).required(),
  email: Joi.string().email().trim().required(),
  role: Joi.string().valid('Admin', 'Manager', 'Technician').default('Technician'),
});

export const equipmentSchema = Joi.object({
  assetId: Joi.string().trim().required(),
  assetName: Joi.string().trim().required(),
  modelNumber: Joi.string().allow('', null),
  serialNumber: Joi.string().allow('', null),
  physicalLocation: Joi.string().trim().required(),
  installationDate: Joi.date().allow(null),
  internalOwner: Joi.string().allow('', null),
  serviceProviderName: Joi.string().allow('', null),
  primaryContactPerson: Joi.string().allow('', null),
  contactPhone: Joi.string().allow('', null),
  contactEmail: Joi.string().email().allow('', null),
  vendorAccountNumber: Joi.string().allow('', null),
  contractExpirationDate: Joi.date().allow(null),
  requiredPartsList: Joi.array().items(Joi.string()),
  estimatedCost: Joi.number().min(0).default(0),
  actualCost: Joi.number().min(0).default(0),
  completionNotes: Joi.string().allow('', null),
});

export const maintenanceTaskSchema = Joi.object({
  maintenanceType: Joi.string().valid('Preventative', 'Corrective', 'Predictive').required(),
  frequencyInterval: Joi.string().valid('Daily', 'Weekly', 'Monthly', 'Quarterly', 'Annual').required(),
  taskDescription: Joi.string().trim().required(),
  standardOperatingProcedureLink: Joi.string().uri().allow('', null),
  priorityLevel: Joi.string().valid('Low', 'Medium', 'High', 'Critical').default('Medium'),
  estimatedDowntimeHours: Joi.number().min(0).default(0),
});

export const maintenanceScheduleSchema = Joi.object({
  equipmentId: Joi.string().required(),
  maintenanceTaskId: Joi.string().required(),
  lastServiceDate: Joi.date().allow(null),
  nextDueDate: Joi.date().required(),
  status: Joi.string().valid('Upcoming', 'In-Progress', 'Completed', 'Overdue').default('Upcoming'),
  estimatedCost: Joi.number().min(0).default(0),
  actualCost: Joi.number().min(0).default(0),
  completionNotes: Joi.string().allow('', null),
  assignedTo: Joi.string().allow('', null),
  completedAt: Joi.date().allow(null),
});

export const reportRecipientSchema = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().trim().allow('', null),
});

export function validate(schema, payload) {
  const { error, value } = schema.validate(payload, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const validationError = new Error(error.details.map((detail) => detail.message).join(', '));
    validationError.status = 400;
    throw validationError;
  }

  return value;
}

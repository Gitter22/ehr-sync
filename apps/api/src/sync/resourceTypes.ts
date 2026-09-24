export const RESOURCE_TYPE_PATIENT = 'Patient';
export const RESOURCE_TYPE_CONDITION = 'Condition';
export const RESOURCE_TYPE_MEDICATION_REQUEST = 'MedicationRequest';

export type ClinicalResourceType =
  typeof RESOURCE_TYPE_CONDITION | typeof RESOURCE_TYPE_MEDICATION_REQUEST;

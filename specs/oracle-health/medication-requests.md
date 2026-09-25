This is instructions only for medication request resource on oracle health.
For general instruction on connecting to oracle health, refer patients.md

Get a list of medication requests
get
/MedicationRequest

Retrieves a list of medication requests that meet supplied query parameters.

Authorization Types

This operation supports the following authorization types:

Provider
Patient
System

Request
Query Parameters
-timing-boundsPeriod: string
_count: number
The maximum number of results to include on a page.
Example: _count=50
_id: string
_lastUpdated: string
The date and time range within which the most recent clinically relevant update was made to the medication.
For a single _lastUpdated occurence:
Must be provided with a le or ge prefix to imply the date range for the medications search.
Example: _lastUpdated=ge2014-05-19T20:54:02.000Z
For two _lastUpdated occurences:
Must be provided with the le and ge prefixes to search for medications within the given upper and lower timestamps, respectively.
Example: _lastUpdated=ge2014-05-19T20:54:02.000Z&_lastUpdated=le2014-05-20T12:00:00.000Z
The time component is required.
Example: _lastUpdated=ge2014-05-19T20:54:02.000Z
_revinclude: string
intent: string
patient: string
status: string
Header Parameters
Authorization(required): string
accept(required): string
The media type to be requested. Refer to what the resource's operation produces for what is supported.

Example: application/fhir+json

Example Request:
GET https://fhir-open.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d/MedicationRequest?patient=12742400

example respnose:

```
{
    'resourceType': 'Bundle',
    'id': 'b630105a-2ec0-4877-8f8c-3b26b53cacd9',
    'type': 'searchset',
    'link': [
      {
        'relation': 'self',
        'url': 'https://fhir-open.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d/MedicationRequest?patient=1316024'
      }
    ],
    'entry': [
      {
        'fullUrl': 'https://fhir-open.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d/MedicationRequest/313757847',
        'resource': {
          'resourceType': 'MedicationRequest',
          'id': '313757847',
          'meta': {
            'versionId': '3',
            'lastUpdated': '2020-07-21T01:00:49.000Z'
          },
          'text': {
            'status': 'generated',
            'div': '<div xmlns=\"http://www.w3.org/1999/xhtml\"><p><b>Medication Request</b></p><p><b>Status</b>: Active</p><p><b>Intent</b>: Order</p><p><b>Medication</b>: lisinopril-hydroCHLOROthiazide(lisinopril-hydroCHLOROthiazide 10 mg-12.5 mg oral tablet)</p><p><b>Dosage Instructions</b>: 1 tab, Oral, Daily</p><p><b>Patient</b>: PETERS, TIM A</p><p><b>Authored On</b>: Nov 21, 2020  8:59 P.M. UTC</p></div>'
          },
          'extension': [
            {
              'valueCodeableConcept': {
                'text': 'Does not need pharmacy verification'
              },
              'url': 'https://fhir-ehr.cerner.com/r4/StructureDefinition/pharmacy-verification-status'
            }
          ],
          'status': 'active',
          'intent': 'order',
          'category': [
            {
              'coding': [
                {
                  'system': 'http://terminology.hl7.org/CodeSystem/medicationrequest-category',
                  'code': 'inpatient',
                  'display': 'Inpatient',
                  'userSelected': false
                }
              ]
            }
          ],
          'reportedBoolean': false,
          'medicationCodeableConcept': {
            'coding': [
              {
                'system': 'http://www.nlm.nih.gov/research/umls/rxnorm',
                'code': '830261',
                'display': 'Hepatitis B Surface Antigen Vaccine 0.04 MG/ML Injectable Suspension',
                'userSelected': false
              },
              {
                'system': 'https://fhir.cerner.com/ec2458f2-1e24-41c8-b71b-0e701af7583d/synonym',
                'code': '19953289',
                'display': 'hepatitis B adult vaccine dialysis 40 mcg/mL intramuscular suspension',
                'userSelected': true
              }
            ],
            'text': 'hepatitis B adult vaccine (hepatitis B adult vaccine dialysis 40 mcg/mL intramuscular suspension)'
          },
          'subject': {
            'reference': 'Patient/12724066',
            'display': 'SMART, NANCY'
          },
          'encounter': {
            'reference': 'Encounter/97953477'
          },
          'authoredOn': '2020-07-06T15:37:13.000-05:00',
          'requester': {
            'reference': 'Practitioner/2',
            'display': 'CERNER, CERNER CERNER'
          },
          'courseOfTherapyType': {
            'coding': [
              {
                'system': 'https://fhir.cerner.com/ec2458f2-1e24-41c8-b71b-0e701af7583d/codeSet/4009',
                'code': '2337',
                'display': 'Physician Stop',
                'userSelected': true
              },
              {
                'system': 'http://terminology.hl7.org/CodeSystem/medicationrequest-course-of-therapy',
                'code': 'acute',
                'display': 'Short course (acute) therapy',
                'userSelected': false
              }
            ],
            'text': 'Physician Stop'
          },
          'reasonCode': [
            {
              'coding': [
                {
                  'system': 'http://snomed.info/sct',
                  'code': '86406008',
                  'display': 'infektion orsakad av humant immunbristvirus (HIV)',
                  'userSelected': true
                }
              ],
              'text': 'infektion orsakad av humant immunbristvirus (HIV)'
            }
          ],
          'dosageInstruction': [
            {
              'extension': [
                {
                  'valueString': '40 mcg = 1 mL, IM, Once, First Dose: 12/07/16 16:00:00 CST',
                  'url': 'https://fhir-ehr.cerner.com/r4/StructureDefinition/clinical-instruction'
                }
              ],
              'text': '40 mcg = 1 mL, IM, Once',
              'patientInstruction': '1 Milliliters Intramuscular (in a muscle) once. Refills: 0.',
              'timing': {
                'repeat': {
                  'boundsPeriod': {
                    'start': '2020-07-06T16:00:00.000-05:00',
                    'end': '2020-07-06T16:00:00.000-05:00'
                  }
                },
                'code': {
                  'coding': [
                    {
                      'system': 'https://fhir.cerner.com/ec2458f2-1e24-41c8-b71b-0e701af7583d/codeSet/4003',
                      'code': '696531',
                      'display': 'Once',
                      'userSelected': true
                    }
                  ],
                  'text': 'Once'
                }
              },
              'route': {
                'coding': [
                  {
                    'system': 'https://fhir.cerner.com/ec2458f2-1e24-41c8-b71b-0e701af7583d/codeSet/4001',
                    'code': '318167',
                    'display': 'IM',
                    'userSelected': true
                  },
                  {
                    'system': 'http://snomed.info/sct',
                    'code': '78421000',
                    'display': 'Intramuscular route (qualifier value)',
                    'userSelected': false
                  }
                ],
                'text': 'IM'
              },
              'method': {
                'coding': [
                  {
                    'system': 'http://snomed.info/sct',
                    'code': '738996007',
                    'display': 'spreja',
                    'userSelected': false
                  }
                ],
                'text': 'Spraying'
              },
              'doseAndRate': [
                {
                  'doseQuantity': {
                    'value': 1.0,
                    'unit': 'mL',
                    'system': 'http://unitsofmeasure.org',
                    'code': 'mL'
                  }
                }
              ]
            }
          ],
          'dispenseRequest': {
            'validityPeriod': {
              'start': '2020-07-06T15:37:13.000-05:00'
            }
          }
        }
      }
    ]
  }
```

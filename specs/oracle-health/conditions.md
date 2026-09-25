This is instructions only for conditions resource on oracle health.
For general instruction on connecting to oracle health, refer patients.md

Get a list of conditions
get
/Condition

Retrieves a list of conditions that meet supplied query parameters.

Request
Query Parameters

_id: string
_lastUpdated: string
The date range in which the condition was last updated.
This parameter may be provided up to two times, and must use the eq, ge, gt, le, or lt prefixes.
When a value is provided without a prefix, an implied eq prefix is used.
When provided twice, the lower value must have a ge or gt prefix and the higher value must have an le or lt prefix.
Example: _lastUpdated=gt2014-09-24 or _lastUpdated=gt2014-09-24T12:00:00.000Z

_revinclude: string
category: string
clinical-status: string
encounter: string
patient: string
Who the condition is for. This parameter is required if _id or subject is not used.
Example: 12345
subject: string

Header Parameters
accept(required): string
The media type to be requested. Refer to what the resource's operation produces for what is supported.

Example: application/fhir+json

not required to model every query param and match functionality with hapi integration
for conditions

Example Request:
GET https://fhir-open.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d/Condition?patient=12724066

Example response

```
{
  "resourceType": "Bundle",
  "id": "9a115304-90d2-47d7-98c4-026f7fe1580e",
  "type": "searchset",
  "total": 2,
  "link": [
    {
      "relation": "self",
      "url": "https://fhir-ehr-code.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d/Condition?patient=12724066"
    }
  ],
  "entry": [
    {
      "fullUrl": "https://fhir-open.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d/Condition/p73077203",
      "resource": {
        "resourceType": "Condition",
        "id": "p73077203",
        "meta": {
          "versionId": "73080185",
          "lastUpdated": "2020-06-11T04:05:04.000Z",
          "security": [
            {
              "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
              "code": "PHY",
              "display": "physician requested information sensitivity",
              "userSelected": false
            },
            {
              "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
              "code": "PRS",
              "display": "patient requested information sensitivity",
              "userSelected": false
            }
          ]
        },
        "text": {
          "status": "extensions",
          "div": "<div xmlns="http://www.w3.org/1999/xhtml"><p><b>Condition</b></p><p><b>Patient</b>: SMART, NANCY</p><p><b>Problem</b>: Pregnant, Patient currently pregnant (finding)</p><p><b>Category Classification</b>: Medical</p><p><b>Clinical Status</b>: Resolved</p><p><b>Verification Status</b>: Confirmed</p><p><b>Onset</b>: Jun 12, 2019</p><p><b>Resolved</b>: Apr  4, 2020  5:00 P.M. UTC</p><p><b>Asserted</b>: Apr 10, 2024</p></div>"
        },
        "extension": [
          {
            "valueDateTime": "2024-04-10",
            "url": "http://hl7.org/fhir/StructureDefinition/condition-assertedDate"
          }
        ]
        "clinicalStatus": {
          "coding": [
            {
              "system": "http://terminology.hl7.org/CodeSystem/condition-clinical",
              "code": "resolved",
              "display": "Resolved",
              "userSelected": false
            }
          ],
          "text": "Resolved"
        },
        "verificationStatus": {
          "coding": [
            {
              "system": "http://terminology.hl7.org/CodeSystem/condition-ver-status",
              "code": "confirmed",
              "display": "Confirmed",
              "userSelected": false
            }
          ],
          "text": "Confirmed"
        },
        "category": [
          {
            "coding": [
              {
                "system": "http://terminology.hl7.org/CodeSystem/condition-category",
                "code": "problem-list-item",
                "display": "Problem List Item"
              }
            ],
            "text": "Problem List Item"
          },
          {
            "coding": [
              {
                "system": "http://snomed.info/sct",
                "code": "74188005",
                "display": "Medical (qualifier value)",
                "userSelected": false
              }
            ],
            "text": "Medical"
          }
        ],
        "code": {
          "coding": [
            {
              "system": "http://snomed.info/sct",
              "code": "77386006",
              "display": "Patient currently pregnant (finding)",
              "userSelected": true
            }
          ],
          "text": "Pregnant"
        },
        "subject": {
          "reference": "Patient/12724066",
          "display": "SMART, NANCY"
        },
        "onsetDateTime": "2019-06-12",
        "abatementDateTime": "2020-04-04T17:00:00.000Z",
        "recordedDate": "2020-03-05T16:54:50.000Z",
        "recorder": {
          "reference": "Practitioner/683925",
          "display": "Cerner Test, Women's Health - Nurse Cerner"
        }
      }
    },
    {
      "fullUrl": "https://fhir-open.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d/Condition/d2572382197",
      "resource": {
        "resourceType": "Condition",
        "id": "d2572382197",
        "meta": {
          "versionId": "2572382197",
          "lastUpdated": "2020-06-11T04:03:21.000Z",
          "security": [
            {
              "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
              "code": "PHY",
              "display": "physician requested information sensitivity",
              "userSelected": false
            },
            {
              "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
              "code": "PRS",
              "display": "patient requested information sensitivity",
              "userSelected": false
            }
          ]
        },
        "text": {
          "status": "extensions",
          "div": "<div xmlns="http://www.w3.org/1999/xhtml"><p><b>Condition</b></p><p><b>Patient</b>: SMART, NANCY</p><p><b>Diagnosis</b>: Anemia, Anemia (disorder)</p><p><b>Diagnosis Type</b>: Discharge</p><p><b>Category Classification</b>: Medical</p><p><b>Clinical Status</b>: Active</p><p><b>Verification Status</b>: Confirmed</p><p><b>Onset</b>: Jun 10, 2020  5:00 P.M. UTC</p><p><b>Asserted</b>: Mar 28, 2024</p></div>"
        },
        "extension": [
          {
            "valueCodeableConcept": {
              "coding": [
                {
                  "system": "http://snomed.info/sct",
                  "code": "89100005",
                  "display": "Final diagnosis (discharge) (contextual qualifier) (qualifier value)",
                  "userSelected": false
                }
              ],
              "text": "Discharge"
            },
            "url": "https://fhir-ehr.cerner.com/r4/StructureDefinition/diagnosis-type"
          },
          {
            "valueDateTime": "2024-03-28",
            "url": "http://hl7.org/fhir/StructureDefinition/condition-assertedDate"
          }
        ],
        "clinicalStatus": {
          "coding": [
            {
              "system": "http://terminology.hl7.org/CodeSystem/condition-clinical",
              "code": "active",
              "display": "Active"
            }
          ],
          "text": "Active"
        },
        "verificationStatus": {
          "coding": [
            {
              "system": "http://terminology.hl7.org/CodeSystem/condition-ver-status",
              "code": "confirmed",
              "display": "Confirmed",
              "userSelected": false
            }
          ],
          "text": "Confirmed"
        },
        "category": [
          {
            "coding": [
              {
                "system": "http://terminology.hl7.org/CodeSystem/condition-category",
                "code": "encounter-diagnosis",
                "display": "Encounter Diagnosis"
              }
            ],
            "text": "Encounter Diagnosis"
          },
          {
            "coding": [
              {
                "system": "http://snomed.info/sct",
                "code": "74188005",
                "display": "Medical (qualifier value)",
                "userSelected": false
              }
            ],
            "text": "Medical"
          }
        ],
        "code": {
          "coding": [
            {
              "system": "http://snomed.info/sct",
              "code": "271737000",
              "display": "Anemia (disorder)",
              "userSelected": true
            },
            {
              "system": "http://hl7.org/fhir/sid/icd-10-cm",
              "code": "D64.9",
              "display": "Anemia, unspecified",
              "userSelected": false
            }
          ],
          "text": "Anemia"
        },
        "subject": {
          "reference": "Patient/12724066",
          "display": "SMART, NANCY"
        },
        "encounter": {
          "reference": "Encounter/97953477"
        },
        "onsetDateTime": "2020-06-10T17:00:00.000Z",
        "recordedDate": "2020-06-11T04:03:21.000Z",
        "recorder": {
          "reference": "Practitioner/4122630",
          "display": "Cerner Test, Physician - Women's Health Cerner"
        }
      }
    },
    {
      "fullUrl": "https://fhir-open.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d/Condition/bed1c2ec-1f33-4097-8296-f6aa01824387",
      "resource": {
        "resourceType": "Condition",
        "id": "bed1c2ec-1f33-4097-8296-f6aa01824387",
        "meta": {
          "versionId": "bed1c2ec-1f33-4097-8296-f6aa01824387",
          "lastUpdated": "2020-10-20T20:46:41.000Z",
          "security": [
            {
              "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
              "code": "PHY",
              "display": "physician requested information sensitivity",
              "userSelected": false
            },
            {
              "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
              "code": "PRS",
              "display": "patient requested information sensitivity",
              "userSelected": false
            }
          ]
        },
        "text": {
          "status": "generated",
          "div": "<div xmlns="http://www.w3.org/1999/xhtml"><p><b>Condition</b></p><p><b>Health Concern</b>: description, description</p><p><b>Clinical Status</b>: Active</p><p><b>Verification Status</b>: Confirmed</p><p><b>Onset</b>: Sep 20, 2020</p><p><b>Recorder</b>: DEXLast2020-10-20T20:46:41.123Z_11, DEXFirst2020-10-20T20:46:41.122Z_48</p><p><b>Recorded Date</b>: Oct 13, 2020  3:46 P.M. CDT</p></div>"
        },
        "clinicalStatus": {
          "coding": [
            {
              "system": "http://terminology.hl7.org/CodeSystem/condition-clinical",
              "code": "active",
              "display": "Active"
            }
          ],
          "text": "Active"
        },
        "verificationStatus": {
          "coding": [
            {
              "system": "http://terminology.hl7.org/CodeSystem/condition-ver-status",
              "code": "confirmed",
              "display": "Confirmed"
            }
          ],
          "text": "Confirmed"
        },
        "category": [
          {
            "coding": [
              {
                "system": "http://hl7.org/fhir/us/core/CodeSystem/condition-category",
                "code": "health-concern",
                "display": "Health Concern"
              }
            ],
            "text": "Health Concern"
          }
        ],
        "code": {
            "coding": [
                {
                    "system": "http://snomed.info/sct",
                    "code": "197480006",
                    "display": "Anxiety disorder (disorder)"
                }
            ],
            "text": "description"
        },
        "subject": {
          "reference": "Patient/9279171"
        },
        "onsetDateTime": "2020-09-20",
        "recordedDate": "2020-10-13T20:46:40.000Z",
        "recorder": {
          "reference": "Practitioner/9279172",
          "display": "DEXLast2020-10-20T20:46:41.123Z_11, DEXFirst2020-10-20T20:46:41.122Z_48"
        },
        "note": [
          {
            "time": "2020-10-20T20:46:41.000Z",
            "text": "comments"
          }
        ]
      }
    }
  ]
}
```

Notes: Just remember this general note from Oracle developer portal, so be careful with handling cross resource ids:

Resource Identity

Please note that no ids or identifiers in the Millennium EHR are intended to be used outside of the context of their complete URL. A complete URL is comprised of the service root url, the resource, and the parameters (if any).

For example, one must take into account the entire url and not simply the id or resource + id:

https://fhir-open.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d/Patient/12742400
In another context the id "Patient/12742400" may identify another person entirely. In the following example a different resource may be returned because the context (service root url) has changed.

https://fhir-open.cerner.com/r4/d075cf8b-3261-481d-97e5-ba6c48d3b41f/Patient/12742400
Similarly when considering an identifier one must consider it only in its full context. Even though some identifiers may exist across multiple systems (ex: MRN) it is not guaranteed that they will refer to the same resource.

https://fhir-open.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d/Patient?identifier=urn:oid:1.1.1.1.1.1|10002700
For example, when using the above MRN in a different system, we are not guaranteed that the same Patient resource is returned in the response bundle:

https://fhir-open.cerner.com/r4/d075cf8b-3261-481d-97e5-ba6c48d3b41f/Patient?identifier=urn:oid:1.1.1.1.1.1|10002700

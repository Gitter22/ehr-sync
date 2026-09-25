`Oracle core base url structure=:serviceRootURL/:resource[?:parameters]`

##### for Open Sandbox the serviceRoot is `ec2458f2-1e24-41c8-b71b-0e701af7583d`

##### So the oracle opensandbox url is

`Oracle Base URL structure= https://fhir-open.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d/:resource[?:parameters]`

`:resource` represents the FHIR standard resource to access. Example: Patient

Many API methods take optional parameters. For GET requests, any parameters not specified as a segment in the path can be passed as an HTTP query string parameter:

`$ curl -i -H "Accept: application/json+fhir" "https://fhir-open.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d/MedicationOrder?patient=2744010&status=active"`

Get a list of patients
get
/Patient

Retrieves a list of patients that meet supplied query parameters.

Note:
A 422 (Unprocessable Content) status code is returned when more than 1000 patients qualify for the search criteria.
The name, family, and given parameters support the :exact modifier and search for current names only, based on the name's period.
Oracle Cerner does not recommend combining the family or given parameters with the name parameter when searching for a patient. Whenever possible, use the :exact modifier.

Request
Query Parameters
_count: integer
Minimum Value: 1
The maximum number of results to return.

Example: _count=15

use a count parameter for a test call and inspect the response. Based on the sample response provided, I cant see a nextlink or nextpage param in respone.

The provided queryparams list also does not list _lastUpdated query param for patient list
this must be verified against actual call and if it does not support, then the sync logic for
oracle health must adopt to this limitation

Example request

```
GET https://fhir-open.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d/Patient?family=smart&given=joe&birthdate=1990-09-15
```

Sample response as per their docs:

```
{
  "resourceType": "Bundle",
  "id": "b8e08a98-849f-4544-9fa8-985aa445e31b",
  "type": "searchset",
  "total": 1,
  "link": [
    {
      "relation": "self",
      "url": "https://fhir-open.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d/Patient?_id=12724067"
    }
  ],
  "entry": [
    {
      "fullUrl": "https://fhir-open.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d/Patient/12724067",
      "resource": {
        "resourceType": "Patient",
        "id": "12724067",
        "meta": {
          "versionId": "10",
          "lastUpdated": "2020-07-06T21:21:22.000Z"
        },
        "text": {
          "status": "generated",
          "div": "<div xmlns="http://www.w3.org/1999/xhtml"><p><b>Patient</b></p><p><b>Name</b>: SMART, JOE</p><p><b>Status</b>: Active</p><p><b>DOB</b>: Apr 29, 1976</p><p><b>Administrative Gender</b>: Male</p><p><b>Marital Status</b>: Married</p></div>"
        },
        "extension": [
          {
            "id": "59434424",
            "extension": [
              {
                "valueCodeableConcept": {
                  "coding": [
                    {
                      "system": "https://fhir.cerner.com/ec2458f2-1e24-41c8-b71b-0e701af7583d/codeSet/4640016",
                      "code": "485602703",
                      "display": "Appointment Reminders",
                      "userSelected": true
                    },
                    {
                      "system": "http://terminology.hl7.org/CodeSystem/communication-topic",
                      "code": "appointment-reminder",
                      "display": "Appointment Reminder",
                      "userSelected": false
                    }
                  ],
                  "text": "Appointment Reminders"
                },
                "url": "communication-type"
              },
              {
                "valueCodeableConcept": {
                  "coding": [
                    {
                      "system": "https://fhir.cerner.com/ec2458f2-1e24-41c8-b71b-0e701af7583d/codeSet/23042",
                      "code": "495085513",
                      "display": "Fax",
                      "userSelected": true
                    },
                    {
                      "system": "http://hl7.org/fhir/contact-point-system",
                      "code": "fax",
                      "display": "Fax",
                      "userSelected": false
                    }
                  ],
                  "text": "Fax"
                },
                "url": "contact-method"
              },
              {
                "valueCodeableConcept": {
                  "coding": [
                    {
                      "system": "https://fhir.cerner.com/ec2458f2-1e24-41c8-b71b-0e701af7583d/codeSet/43",
                      "code": "163",
                      "display": "Business",
                      "userSelected": true
                    },
                    {
                      "system": "http://hl7.org/fhir/contact-point-use",
                      "code": "work",
                      "display": "Work",
                      "userSelected": false
                    }
                  ],
                  "text": "Business"
                },
                "url": "contact-type"
              },
              {
                "valueDateTime": "2019-04-13T20:00:00.000Z",
                "url": "verified-datetime"
              }
            ],
            "url": "https://fhir-ehr.cerner.com/r4/StructureDefinition/communication-preference"
          },
          {
            "extension": [
              {
                "valueCoding": {
                  "system": "urn:oid:2.16.840.1.113883.6.238",
                  "code": "2106-3",
                  "display": "White",
                  "userSelected": false
                },
                "url": "ombCategory"
              },
              {
                "valueString": "White",
                "url": "text"
              }
            ],
            "url": "http://hl7.org/fhir/us/core/StructureDefinition/us-core-race"
          },
          {
            "extension": [
              {
                "valueCoding": {
                  "system": "urn:oid:2.16.840.1.113883.6.238",
                  "code": "2186-5",
                  "display": "Non Hispanic or Latino",
                  "userSelected": false
                },
                "url": "ombCategory"
              },
              {
                "valueString": "Not Hispanic, Latino, or Spanish Origin",
                "url": "text"
              }
            ],
            "url": "http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity"
          },
          {
            "valueCodeableConcept": {
              "coding": [
                {
                  "system": "http://snomed.info/sct",
                  "code": "446141000124107",
                  "display": "Identifies as female gender (finding)",
                  "userSelected": false
                }
              ],
              "text": "Identifies as female"
            },
            "url": "http://hl7.org/fhir/us/core/StructureDefinition/us-core-genderIdentity"
          },
          {
            "extension": [
              {
                "valueCodeableConcept": {
                  "coding": [
                    {
                      "system": "http://terminology.hl7.org/CodeSystem/v3-TribalEntityUS",
                      "code": "557",
                      "display": "Umkumiut Native Village",
                      "userSelected": true
                    }
                  ],
                  "text": "Umkumiut Native Village"
                },
                "url": "tribalAffiliation"
              }
            ],
            "url": "http://hl7.org/fhir/us/core/StructureDefinition/us-core-tribal-affiliation"
          },
          {
            "url": "http://hl7.org/fhir/us/core/StructureDefinition/us-core-sex",
            "valueCode": "248153007"
          }
        ],
        "identifier": [
          {
            "id": "CI-490016886-0",
            "use": "usual",
            "type": {
              "coding": [
                {
                  "system": "https://fhir.cerner.com/ec2458f2-1e24-41c8-b71b-0e701af7583d/codeSet/4",
                  "code": "10",
                  "display": "MRN",
                  "userSelected": true
                },
                {
                  "system": "http://terminology.hl7.org/CodeSystem/v2-0203",
                  "code": "MR",
                  "display": "Medical record number",
                  "userSelected": false
                }
              ],
              "text": "MRN"
            },
            "system": "urn:oid:2.16.840.1.113883.6.1000",
            "value": "6931",
            "period": {
              "start": "2019-12-26T15:14:12.000Z"
            }
          },
          {
            "id": "CI-490058771-1",
            "use": "usual",
            "type": {
              "coding": [
                {
                  "system": "https://fhir.cerner.com/ec2458f2-1e24-41c8-b71b-0e701af7583d/codeSet/4",
                  "code": "10",
                  "display": "MRN",
                  "userSelected": true
                },
                {
                  "system": "http://terminology.hl7.org/CodeSystem/v2-0203",
                  "code": "MR",
                  "display": "Medical record number",
                  "userSelected": false
                }
              ],
              "text": "MRN"
            },
            "system": "urn:oid:2.16.840.1.113883.6.1000",
            "value": "6978",
            "period": {
              "end": "2020-07-06T21:21:25.000Z"
            }
          },
          {
            "id": "CI-490059574-3",
            "use": "usual",
            "type": {
              "coding": [
                {
                  "system": "https://fhir.cerner.com/ec2458f2-1e24-41c8-b71b-0e701af7583d/codeSet/4",
                  "code": "670843",
                  "display": "Messaging",
                  "userSelected": true
                },
                {
                  "system": "http://terminology.hl7.org/CodeSystem/v2-0203",
                  "code": "U",
                  "display": "Unspecified identifier",
                  "userSelected": false
                }
              ],
              "text": "Messaging"
            },
            "_system": {
              "extension": [
                {
                  "valueCode": "unknown",
                  "url": "http://hl7.org/fhir/StructureDefinition/data-absent-reason"
                }
              ]
            },
            "value": "3C36293A3B964994AD8E6C0305F3330A",
            "period": {
              "start": "2020-06-30T20:08:26.000Z"
            }
          },
          {
            "id": "CI-490058805-4",
            "use": "usual",
            "type": {
              "coding": [
                {
                  "system": "https://fhir.cerner.com/ec2458f2-1e24-41c8-b71b-0e701af7583d/codeSet/4",
                  "code": "670843",
                  "display": "Messaging",
                  "userSelected": true
                },
                {
                  "system": "http://terminology.hl7.org/CodeSystem/v2-0203",
                  "code": "U",
                  "display": "Unspecified identifier",
                  "userSelected": false
                }
              ],
              "text": "Messaging"
            },
            "_system": {
              "extension": [
                {
                  "valueCode": "unknown",
                  "url": "http://hl7.org/fhir/StructureDefinition/data-absent-reason"
                }
              ]
            },
            "value": "43DA797A657B47548F258A9B50EB41F5",
            "period": {
              "start": "2020-06-12T16:03:32.000Z"
            }
          },
          {
            "id": "CI-490059570-5",
            "use": "usual",
            "type": {
              "coding": [
                {
                  "system": "https://fhir.cerner.com/ec2458f2-1e24-41c8-b71b-0e701af7583d/codeSet/4",
                  "code": "2553236771",
                  "display": "Federated Person Principal",
                  "userSelected": true
                },
                {
                  "system": "http://terminology.hl7.org/CodeSystem/v2-0203",
                  "code": "AN",
                  "display": "Account number",
                  "userSelected": false
                }
              ],
              "text": "Federated Person Principal"
            },
            "system": "urn:oid:2.16.840.1.113883.3.13.6",
            "value": "URN:CERNER:IDENTITY-FEDERATION:REALM:E8A84236-C258-4952-98B7-A6FF8A9C587A-CH:PRINCIPAL:AN7TD9A62CV8Z53Z",
            "period": {
              "start": "2020-06-30T20:08:25.000Z"
            }
          },
          {
            "id": "CI-490058801-6",
            "use": "usual",
            "type": {
              "coding": [
                {
                  "system": "https://fhir.cerner.com/ec2458f2-1e24-41c8-b71b-0e701af7583d/codeSet/4",
                  "code": "2553236771",
                  "display": "Federated Person Principal",
                  "userSelected": true
                },
                {
                  "system": "http://terminology.hl7.org/CodeSystem/v2-0203",
                  "code": "AN",
                  "display": "Account number",
                  "userSelected": false
                }
              ],
              "text": "Federated Person Principal"
            },
            "system": "urn:oid:2.16.840.1.113883.3.13.6",
            "value": "URN:CERNER:IDENTITY-FEDERATION:REALM:E8A84236-C258-4952-98B7-A6FF8A9C587A-CH:PRINCIPAL:KR8KC9MI9EQ8KC23",
            "period": {
              "start": "2020-06-12T16:03:29.000Z"
            }
          }
        ],
        "active": true,
        "name": [
          {
            "id": "CI-12724067-0",
            "use": "official",
            "text": "SMART, JOE",
            "family": "SMART",
            "given": [
              "JOE"
            ],
            "period": {
              "start": "2019-12-26T15:14:12.000Z"
            }
          },
          {
            "id": "CI-490059796-0",
            "use": "old",
            "text": "SMART, STEPHEN ALLEN",
            "family": "SMART",
            "given": [
              "STEPHEN",
              "ALLEN"
            ],
            "period": {
              "end": "2020-07-06T21:21:26.000Z"
            }
          }
        ],
        "telecom": [
          {
            "id": "CI-PH-29811920-0",
            "extension": [
              {
                "valueUrl": "(816)888-8886",
                "url": "http://hl7.org/fhir/StructureDefinition/iso21090-TEL-address"
              },
              {
                "valueString": "12345",
                "url": "http://hl7.org/fhir/StructureDefinition/contactpoint-extension"
              }
            ],
            "system": "phone",
            "value": "8168888886",
            "use": "home",
            "rank": "1",
            "period": {
              "start": "2019-12-26T15:14:12.000Z"
            }
          },
          {
            "id": "CI-EM-29822662-0",
            "system": "email",
            "value": "joesmart@yopmail.com",
            "use": "home",
            "rank": "1",
            "period": {
              "start": "2020-03-30T19:31:11.000Z"
            }
          }
        ],
        "gender": "male",
        "birthDate": "1976-04-29",
        "deceasedBoolean": false,
        "address": [
          {
            "id": "CI-24313553-0",
            "use": "home",
            "text": "12345 Main St\\nKansas city, MO 64116\\nUS",
            "line": [
              "12345 Main St"
            ],
            "city": "Kansas city",
            "district": "Jackson",
            "state": "MO",
            "postalCode": "64116",
            "country": "US",
            "period": {
              "start": "2019-12-26T15:13:36.000Z"
            }
          }
        ],
        "maritalStatus": {
          "coding": [
            {
              "system": "https://fhir.cerner.com/ec2458f2-1e24-41c8-b71b-0e701af7583d/codeSet/38",
              "code": "309237",
              "display": "Married",
              "userSelected": true
            },
            {
              "system": "http://terminology.hl7.org/CodeSystem/v3-MaritalStatus",
              "code": "M",
              "display": "Married",
              "userSelected": false
            }
          ],
          "text": "Married"
        },
        "communication": [
          {
            "language": {
              "coding": [
                {
                  "system": "https://fhir.cerner.com/ec2458f2-1e24-41c8-b71b-0e701af7583d/codeSet/36",
                  "code": "151",
                  "display": "English",
                  "userSelected": true
                },
                {
                  "system": "urn:ietf:bcp:47",
                  "code": "en",
                  "display": "English",
                  "userSelected": false
                }
              ],
              "text": "English"
            },
            "preferred": true
          }
        ],
        "generalPractitioner": [
          {
            "id": "CI-490017023-0",
            "reference": "Practitioner/4122622",
            "display": "Cerner Test, Physician - Hospitalist Cerner"
          },
          {
            "reference": "Organization/675844",
            "display": "Example Active Practice"
          }
        ]
      }
    }
  ]
}
```

Study this response and analyze whether it can populate the currently selected fields for normalization from HAPI implementation. Store RAW json as before alongwith storing the source

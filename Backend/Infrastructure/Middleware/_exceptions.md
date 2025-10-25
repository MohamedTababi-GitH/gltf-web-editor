| Exception Type          | Used When...                                    | Example Case                     | HTTP Code |
| ----------------------- | ----------------------------------------------- | -------------------------------- | --------- |
| **BadRequestException** | Request structure or content is missing/invalid | `request == null`, missing files | 400       |
| **ValidationException** | Input data fails business validation rules      | Invalid alias, wrong file type   | 422       |
| **NotFoundException**   | Resource cannot be found in storage             | No model with given ID           | 404       |

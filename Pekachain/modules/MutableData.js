"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** MutableData class, these are set of users' data that are mutable, i.e they are liable to change. Note, such data are not added to transaction block, they are for user records. eg: email, telephone, country etc. */
class MutableData {
    email = undefined;
    telephone = undefined;
    country = undefined;
    highestDegree = undefined;
    school = undefined;
    job = undefined;
    company = undefined;
    constructor(data) {
        if (data) {
            (data.email !== undefined ? this.email = data.email : null);
            (data.telephone !== undefined ? this.telephone = data.telephone : null);
            (data.country !== undefined ? this.country = data.country : null);
            (data.highestDegree !== undefined ? this.highestDegree = data.highestDegree : null);
            (data.school !== undefined ? this.school = data.school : null);
            (data.job !== undefined ? this.job = data.job : null);
            (data.company !== undefined ? this.company = data.company : null);
        }
    }
    getMutableData() {
        let data = JSON.parse(JSON.stringify(this));
        delete data['mutableHashValue'];
        delete data['password'];
        return data;
    }
}
exports.default = MutableData;

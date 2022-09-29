import User from "./User";

/** MutableData class, these are set of users' data that are mutable, i.e they are liable to change. Note, such data are not added to transaction block, they are for user records. eg: email, telephone, country etc. */
export default class MutableData {
    private email: string|undefined = undefined;
    private telephone: string|undefined = undefined;
    private country: string|undefined = undefined;
    private highestDegree: string|undefined = undefined;
    private school: string|undefined = undefined;
    private job: string|undefined = undefined;
    private company: string|undefined = undefined;

    constructor(data?:any){
        if (data){
            (data.email !== undefined ? this.email = data.email : null);
            (data.telephone !== undefined ? this.telephone = data.telephone : null);
            (data.country !== undefined ? this.country = data.country : null);
            (data.highestDegree !== undefined ? this.highestDegree = data.highestDegree : null);
            (data.school !== undefined ? this.school = data.school : null);
            (data.job !== undefined ? this.job = data.job : null);
            (data.company !== undefined ? this.company = data.company : null);
        }
    }
    getMutableData(): MutableData {
        let data = JSON.parse(JSON.stringify(this));
        delete data['mutableHashValue'];
        delete data['password'];
        return data;
    }
} 
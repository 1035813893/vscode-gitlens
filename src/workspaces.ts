export class GKWorkspace {
    private readonly _id: string;
    private readonly _name: string;
    private readonly _repositories: string[];
    constructor(id: string, name: string, repositories: string[]) {
        this._id = id;
        this._name = name;
        this._repositories = repositories;
    }

    get id(): string {
        return this._id;
    }

    get name(): string {
        return this._name;
    }

    get repositories(): string[] {
        return this._repositories;
    }
}

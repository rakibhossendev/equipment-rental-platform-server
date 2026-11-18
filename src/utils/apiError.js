export class ApiError extends Error{
    constructor(errorMessage,statusCode){
        super(errorMessage);
        this.name = "ApiError",
        this.statusCode = statusCode
    }
}
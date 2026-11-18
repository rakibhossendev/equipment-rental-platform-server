export function sendAPIResponse(response,data = null,success=true,statusCode=200,message="success"){
    return response.status(statusCode).json({
        success,
        message,
        data,
    })
}
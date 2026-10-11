const asyncHandler = (requestHandler) =>{
    return (req,res,next) =>{
        Promise.resolve(requestHandler(req,res,next)).
        catch((err) => next(err))
    }
}

export {asyncHandler}










//The above is with promises

/*

const asyncHandler = () =>{}
const asyncHandler = (function) => { () => {} }
const asyncHandler = (function) => async { () => {} }
also can be written as

next is flag


With this code we're wrapping every function with try catch


const asyncHandler = (fn) => async (req,res,next) =>{
    try{
        await fn(req,res,next)
    }catch(error){
        res.status(err.code || 500).json({
            success:false,
            message:err.message
        })
    }
}
    
The above code is implemented for try-catch
*/
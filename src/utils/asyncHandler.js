const asyncHandler = (requestHandler)=>{
    return (req, res,next ) => {
        Promise.resolve(requestHandler(req,res,next)).
        catch((err)=>next(err))
    }
}


export {asyncHandler}


// higher order functions can accept functions as parameters and even return them



// do method hain aik promise se aur dusra try catch se
// const asyncHandler = (fn) => async (req, res, next) => {
//     try {
//         await fn(req, res, next)
//     } catch (error) {
//         res.status(err.code || 500).json({
//             success: true,
//             message: err.message
//         })
//     }
// }

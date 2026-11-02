


const successMessage=(res, status=200, message="success", data=null)=>{
    return res.status(status).json({success:true, message, data})
};



const errorMessage =(res, status= 500, message="error", data=null)=>{
    return res.status(status).json({success:false, message, data})
}


export {successMessage, errorMessage}
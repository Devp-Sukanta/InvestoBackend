import bcrypt from "bcryptjs";

export const hashPassword = async (password) => {
    try {
        const salt = await bcrypt.genSalt(10);
        return await bcrypt.hash(password, salt);
    } catch (error) {
        return null;
    }
};

export const comparePassword = async (password, hashedPassword) => {
        // console.log(password,hashedPassword)

    try {
        return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
        console.log(error)
        return null;
    }
};
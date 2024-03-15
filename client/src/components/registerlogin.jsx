import axios from "axios";
import { useContext, useState } from "react";
import { userContext } from "./userContext";

export default function Registerlogin () {

    const [username, setUsername] = useState('') ;
    const [password, setPassword] = useState('') ;
    const [isLoginorRegister, setIsLoginorRegister] = useState('login') ;
    const {setUsername : setLoggedInUsername,setUserId} = useContext(userContext) ;

    async function handleSubmit(e){
        e.preventDefault() ;
        const url = isLoginorRegister ;
        try {
            const {data} = await axios.post(url, {username,password});
            //console.log(data) ;
            if(url === 'register'){
                setLoggedInUsername(username) ;
                setUserId(data.id) ;
            }else if (url === "login"){
                if(data === "Invalid-Cred"){
                    console.log("wrong id or pass") ;
                } else {
                    setLoggedInUsername(username) ;
                    setUserId(data.id) ;
                }
            }
            
        } catch (error) {
            if(error) console.log(error) ;
        }
    }

    return(
            <div className="h-screen flex items-center">
                <form onSubmit={handleSubmit} className="mx-auto flex flex-col w-64 p-4 my-4 text-center" >
                        <div className="font-bold font-mono text-lg border-b ">Chat Application</div>
                        <div className="flex justify-around gap-1 my-3 items-center w-full">
                            <button type="button" onClick={e => setIsLoginorRegister('login')} className={"rounded-md py-1.5 px-2 w-80 "+(isLoginorRegister === 'login' ? "bg-blue-300 block" : "bg-gray-200")} >Login</button>
                            <button type="button" onClick={e => setIsLoginorRegister('register')} className={"rounded-md px-2 w-80 py-1.5 "+(isLoginorRegister === 'register' ? "bg-blue-300 " : "bg-gray-200")}>Register</button>
                        </div>
                        <input 
                            type = "text"
                            className="p-1 px-3 mb-2 border rounded-md "
                            value = {username}
                            placeholder="username"
                            onChange = {e => setUsername(e.target.value)}
                        />

                        <input 
                            type = "password"
                            value = {password}
                            className="p-1 mb-2 border rounded-md px-3"
                            autoComplete="false"
                            placeholder="password"
                            onChange = {e => setPassword(e.target.value)}
                        />
                        
                        <button 
                            type="submit"
                            className="bg-blue-500 p-1 mb-2 border rounded-md" 
                        >
                            { isLoginorRegister === 'login' ? 'Login' : 'Register' }
                        </button>
                </form>
            </div>
    ) ;
}
import axios from "axios";
import { createContext, useEffect, useState } from "react";

export const userContext = createContext({}) ;

export default function UserContextProvider({children}) {

    const [userId, setUserId] = useState(null) ;
    const [username, setUsername] = useState(null) ;

    useEffect( () => {
            axios.get('/profile').then( response => {
                    setUserId(response.data.userId) ;
                    setUsername(response.data.username) ;
                    //console.log(response.data) ;
                }
            ) ;
    }, []) ;

    return(
        <userContext.Provider value={{userId,setUserId,username,setUsername}}>
            {children}
        </userContext.Provider>
    ) ;
}

import { useContext, useState } from "react";
import Registerlogin from "./registerlogin";
import { userContext } from "./userContext";
import Chat from "./chat";

export default function Routes () {

    const {username,id} = useContext(userContext) ;
    if(username ) return (<Chat/>) ;

    return(
        <Registerlogin/>
    ) ;
} 
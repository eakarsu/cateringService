import {createContext,useContext,useEffect,useState} from 'react';import api from '../utils/api';
const AuthContext=createContext(null);
export function AuthProvider({children}){const[user,setUser]=useState(null);const[loading,setLoading]=useState(true);useEffect(()=>{api.get('/session').then(r=>setUser(r.data.user)).catch(()=>setUser(null)).finally(()=>setLoading(false));},[]);const login=()=>window.location.assign('/api/auth/sso');const logout=async()=>{await api.post('/auth/logout').catch(()=>{});setUser(null);};return <AuthContext.Provider value={{user,loading,login,logout}}>{children}</AuthContext.Provider>}
export const useAuth=()=>useContext(AuthContext);

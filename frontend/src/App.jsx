import {AuthProvider,useAuth} from './context/AuthContext';import ErrorBoundary from './components/ErrorBoundary';import Layout from './components/Layout';import Login from './pages/Login';import CommerceOperations from './pages/CommerceOperations';
function SessionApp(){const{user,loading}=useAuth();if(loading)return <div className="min-h-screen grid place-items-center">Verifying organization session…</div>;if(!user)return <Login/>;return <Layout><CommerceOperations/></Layout>}
export default function App(){return <ErrorBoundary><AuthProvider><SessionApp/></AuthProvider></ErrorBoundary>}

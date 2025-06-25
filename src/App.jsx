import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getFirestore, 
    collection, 
    addDoc, 
    onSnapshot, 
    deleteDoc, 
    doc,
    updateDoc,
    query,
    setLogLevel
} from 'firebase/firestore';
// Importações de autenticação atualizadas
import { 
    getAuth,
    initializeAuth,
    onAuthStateChanged,
    signInAnonymously,
    browserLocalPersistence // Usaremos esta persistência para evitar 'eval'
} from 'firebase/auth';

// ====================================================================================
// =================== PASSO CRUCIAL: COLE AS SUAS CREDENCIAIS AQUI ====================
const firebaseConfig = {
  apiKey: "AIzaSyClT4SIeeHKFRCTlU47-CYYWCa2ywDHZw0",
  authDomain: "dashboard-veiculosatt.firebaseapp.com",
  projectId: "dashboard-veiculosatt",
  storageBucket: "dashboard-veiculosatt.firebasestorage.app",
  messagingSenderId: "688815634295",
  appId: "1:688815634295:web:e464f13a31c76b36569372",
  measurementId: "G-0835JBCZWT"
};
// ====================================================================================

// --- Ícones SVG e Componentes (sem alterações) ---
const TruckIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-6 w-6"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"></path><path d="M15 18H9"></path><path d="M19 18h2a1 1 0 0 0 1-1v-3.34a1 1 0 0 0-.17-.53L18.83 9.5a1 1 0 0 0-.83-.5H15a2 2 0 0 0-2 2v7"></path><circle cx="6.5" cy="18.5" r="2.5"></circle><circle cx="16.5" cy="18.5" r="2.5"></circle></svg>);
const TrashIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>);
const EditIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>);
const Spinner = () => (<div className="flex justify-center items-center p-8"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div></div>);

const BRAND_OPTIONS = ["Scania", "Volvo", "Mercedez"];
const STATUS_OPTIONS = ["Em Manutenção", "Aguardando Peças", "Liberado"];
const LOCATION_OPTIONS = ["Box Scania", "Box Volvo", "Borracharia", "SOS", "Terceiros"];

const EditModal = ({ truck, isOpen, onClose, onSave, userId }) => {
    const [formData, setFormData] = useState(truck);
    useEffect(() => { setFormData(truck); }, [truck]);
    if (!isOpen || !formData) return null;
    const handleChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); };
    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ ...formData, lastUpdatedAt: new Date().toISOString(), lastUpdatedBy: userId, thirdPartyName: formData.location === 'Terceiros' ? formData.thirdPartyName : '' });
    };
    return ( <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4"> <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-lg mx-4 max-h-full overflow-y-auto"> <h2 className="text-2xl font-semibold mb-4 text-gray-900">Editar Veículo</h2> <form onSubmit={handleSubmit} className="space-y-4"> <div> <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label> <select name="brand" value={formData.brand} onChange={handleChange} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition text-gray-800"> {BRAND_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)} </select> </div> <div> <label className="block text-sm font-medium text-gray-700 mb-1">Frota</label> <input type="text" name="fleetNumber" value={formData.fleetNumber} onChange={handleChange} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition text-gray-800" /> </div> <div> <label className="block text-sm font-medium text-gray-700 mb-1">Descrição do Problema</label> <input type="text" name="problem" value={formData.problem} onChange={handleChange} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition text-gray-800" /> </div> <div> <label className="block text-sm font-medium text-gray-700 mb-1">Status</label> <select name="status" value={formData.status} onChange={handleChange} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition text-gray-800"> {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)} </select> </div> <div> <label className="block text-sm font-medium text-gray-700 mb-1">Local da Manutenção</label> <select name="location" value={formData.location} onChange={handleChange} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition text-gray-800"> {LOCATION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)} </select> </div> {formData.location === 'Terceiros' && ( <div> <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Terceiro</label> <input type="text" name="thirdPartyName" placeholder="Digite o nome da empresa" value={formData.thirdPartyName || ''} onChange={handleChange} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition text-gray-800" /> </div> )} <div> <label className="block text-sm font-medium text-gray-700 mb-1">Previsão</label> <input type="datetime-local" name="forecastDateTime" value={formData.forecastDateTime} onChange={handleChange} className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition text-gray-800" /> </div> <div className="mt-6 flex justify-end space-x-4"> <button type="button" onClick={onClose} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg transition">Cancelar</button> <button type="submit" className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-lg transition">Salvar Alterações</button> </div> </form> </div> </div> );
};
const BrandColumn = ({ title, titleColor, badgeBg, trucks, renderTruckCard }) => { const groupedByLocation = trucks.reduce((acc, truck) => { const location = truck.location || 'Não especificado'; if (!acc[location]) { acc[location] = []; } acc[location].push(truck); return acc; }, {}); const sortedLocations = Object.keys(groupedByLocation).sort((a, b) => LOCATION_OPTIONS.indexOf(a) - LOCATION_OPTIONS.indexOf(b)); return ( <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md border border-gray-200"> <h2 className={`text-3xl font-bold ${titleColor} mb-4`}>{title} ({trucks.length})</h2> <div className="space-y-6"> {trucks.length > 0 ? ( sortedLocations.map(location => ( <div key={location}> <div className="flex items-center mb-2"> <h3 className="text-lg font-semibold text-gray-800">{location}</h3> <span className={`ml-2 text-sm font-bold text-white ${badgeBg} py-1 px-2.5 rounded-full`}> {groupedByLocation[location].length} </span> </div> <div className="space-y-4">{groupedByLocation[location].map(renderTruckCard)}</div> </div> )) ) : ( <p className="text-gray-500 text-center py-4">Nenhum veículo {title} parado.</p> )} </div> </div> ); };

// --- Componente principal da Aplicação ---
export default function App() {
    const [trucks, setTrucks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [formError, setFormError] = useState('');
    const [newFleet, setNewFleet] = useState('');
    const [newProblem, setNewProblem] = useState('');
    const [newDateTime, setNewDateTime] = useState('');
    const [newBrand, setNewBrand] = useState('Scania');
    const [newStatus, setNewStatus] = useState('Em Manutenção');
    const [newLocation, setNewLocation] = useState('Box Scania');
    const [newThirdPartyName, setNewThirdPartyName] = useState('');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [currentlyEditingTruck, setCurrentlyEditingTruck] = useState(null);
    const [db, setDb] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const trucksCollectionRef = useRef(null);

    useEffect(() => {
        try {
            if (firebaseConfig && firebaseConfig.apiKey !== "SUA_API_KEY_AQUI") {
                const app = initializeApp(firebaseConfig);
                const firestoreDb = getFirestore(app);
                
                // --- NOVA INICIALIZAÇÃO DA AUTENTICAÇÃO ---
                // Esta abordagem explícita evita a parte da biblioteca que usa 'eval'.
                const auth = initializeAuth(app, {
                    persistence: browserLocalPersistence
                });
                
                setDb(firestoreDb);
                trucksCollectionRef.current = collection(firestoreDb, `stopped_trucks`);

                onAuthStateChanged(auth, async (user) => {
                    if (user) {
                        setUserId(user.uid); 
                        setIsAuthReady(true);
                    } else {
                        try {
                            await signInAnonymously(auth);
                        } catch (authError) { 
                            console.error("Erro na autenticação anónima:", authError); 
                            setError("Falha ao autenticar."); 
                        }
                    }
                });
            } else { 
                 setError("Configuração do Firebase não encontrada. Cole as suas credenciais no ficheiro App.jsx."); 
                 setIsLoading(false); 
            }
        } catch (e) { 
            console.error("Erro ao inicializar Firebase:", e); 
            setError("Ocorreu um erro crítico na inicialização."); 
            setIsLoading(false); 
        }
    }, []);

    useEffect(() => {
        if (!isAuthReady || !db) return;
        setIsLoading(true);
        const q = query(trucksCollectionRef.current);
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const trucksData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            trucksData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setTrucks(trucksData);
            setIsLoading(false);
        }, (err) => { console.error("Erro ao buscar dados:", err); setError("Não foi possível carregar os dados."); setIsLoading(false); });
        return () => unsubscribe();
    }, [isAuthReady, db]);

    const handleAddTruck = async (e) => {
        e.preventDefault();
        setFormError('');
        const missingFields = [];
        if (!newFleet.trim()) missingFields.push('Frota');
        if (!newProblem.trim()) missingFields.push('Descrição do Problema');
        if (!newDateTime) missingFields.push('Previsão');
        if (newLocation === 'Terceiros' && !newThirdPartyName.trim()) missingFields.push('Nome do Terceiro');
        if (missingFields.length > 0) { setFormError(`Por favor, preencha os seguintes campos: ${missingFields.join(', ')}.`); return; }
        try {
            await addDoc(trucksCollectionRef.current, { brand: newBrand, fleetNumber: newFleet, problem: newProblem, status: newStatus, location: newLocation, thirdPartyName: newLocation === 'Terceiros' ? newThirdPartyName : '', forecastDateTime: newDateTime, addedBy: userId, createdAt: new Date().toISOString(), lastUpdatedAt: null, lastUpdatedBy: null, });
            setNewFleet(''); setNewProblem(''); setNewDateTime(''); setNewStatus('Em Manutenção'); setNewLocation('Box Scania'); setNewThirdPartyName('');
        } catch (err) { console.error("Erro ao adicionar:", err); setFormError('Ocorreu um erro ao salvar o veículo. Tente novamente.'); }
    };
    const handleUpdateTruck = async (updatedTruckData) => { if (!updatedTruckData?.id) return; const { id, ...dataToUpdate } = updatedTruckData; const docRef = doc(db, "stopped_trucks", id); try { await updateDoc(docRef, dataToUpdate); closeEditModal(); } catch(err) { console.error("Erro ao atualizar:", err); } };
    const handleDeleteTruck = async (id) => { const docRef = doc(db, "stopped_trucks", id); try { await deleteDoc(docRef); } catch(err) { console.error("Erro ao deletar:", err); } };
    const openEditModal = (truck) => { setCurrentlyEditingTruck(truck); setIsEditModalOpen(true); };
    const closeEditModal = () => { setCurrentlyEditingTruck(null); setIsEditModalOpen(false); };
    const getStatusClass = (status) => { switch (status) { case "Liberado": return "bg-green-100 text-green-800 border-green-200"; case "Aguardando Peças": return "bg-yellow-100 text-yellow-800 border-yellow-200"; default: return "bg-orange-100 text-orange-800 border-orange-200"; } };
    const formatLocation = (truck) => (truck.location === 'Terceiros' && truck.thirdPartyName) ? `Terceiros (${truck.thirdPartyName})` : truck.location;
    const formatDateTime = (dt) => dt ? new Date(dt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : "N/A";
    const renderTruckCard = (truck) => ( <div key={truck.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex flex-col justify-between transition hover:shadow-md hover:scale-[1.02] space-y-3"> <div> <div className="flex justify-between items-start"> <p className="font-bold text-lg text-gray-900">Frota: {truck.fleetNumber}</p> <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${getStatusClass(truck.status)}`}>{truck.status}</span> </div> <p className="text-gray-700 mt-1">{truck.problem}</p> <p className="text-sm text-gray-600 mt-2">Local: <span className="font-semibold text-gray-800">{formatLocation(truck)}</span></p> <p className="text-sm text-cyan-700 font-medium mt-1">Previsão: {formatDateTime(truck.forecastDateTime)}</p> </div> <div className="border-t border-gray-200 pt-2 text-xs text-gray-500 flex justify-between items-center"> <div> <p>{truck.lastUpdatedAt ? 'Atualizado' : 'Adicionado'}: {formatDateTime(truck.lastUpdatedAt || truck.createdAt)}</p> <p>Por: {(truck.lastUpdatedBy || truck.addedBy)?.substring(0, 10)}...</p> </div> <div className="flex items-center space-x-1"> <button onClick={() => openEditModal(truck)} className="text-gray-500 hover:text-cyan-600 transition p-2 rounded-full hover:bg-cyan-100"><EditIcon /></button> <button onClick={() => handleDeleteTruck(truck.id)} className="text-gray-500 hover:text-red-600 transition p-2 rounded-full hover:bg-red-100"><TrashIcon /></button> </div> </div> </div> );

    return ( <div className="bg-gray-50 min-h-screen text-gray-800 font-sans p-4 sm:p-6 lg:p-8"> <div className="max-w-screen-xl mx-auto"> <div className="text-center mb-4"> <h1 className="text-4xl sm:text-5xl font-bold text-cyan-600 flex items-center justify-center"><TruckIcon />Dashboard de Veículos Parados</h1> <p className="text-gray-600 mt-2">Dados atualizados em tempo real</p> </div> <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-8 mb-6"> <div className="bg-white border border-gray-200 rounded-lg px-6 py-3 text-center w-full sm:w-auto shadow-sm"> <p className="text-lg text-gray-500">Total em Manutenção</p> <p className="text-4xl font-bold text-cyan-600">{trucks.length}</p> </div> <div className="bg-white border border-gray-200 rounded-lg px-6 py-3 text-center w-full sm:w-auto shadow-sm"> <p className="text-lg text-gray-500">DM (Disponibilidade)</p> <p className="text-4xl font-bold text-yellow-500">{(((trucks.length / 203) - 1) * -1 * 100).toFixed(2)}%</p> </div> </div> {userId && <p className="text-center text-xs text-gray-500 mb-6">Seu ID de sessão: {userId}</p>} {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6 text-center">{error}</div>} <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 mb-8"> <h2 className="text-2xl font-semibold mb-4 text-gray-900">Adicionar Novo Veículo</h2> {formError && ( <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4 text-center"> {formError} </div> )} <form onSubmit={handleAddTruck} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end"> <div><label className="block text-sm font-medium text-gray-700 mb-1">Marca</label><select value={newBrand} onChange={(e) => setNewBrand(e.target.value)} className="w-full bg-gray-50 border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition">{BRAND_OPTIONS.map(o=><option key={o}>{o}</option>)}</select></div> <div><label className="block text-sm font-medium text-gray-700 mb-1">Frota</label><input type="text" value={newFleet} onChange={(e) => setNewFleet(e.target.value)} placeholder="Ex: 12345" className="w-full bg-gray-50 border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition" /></div> <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Descrição do Problema</label><input type="text" value={newProblem} onChange={(e) => setNewProblem(e.target.value)} placeholder="Ex: Falha no motor" className="w-full bg-gray-50 border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition" /></div> <div><label className="block text-sm font-medium text-gray-700 mb-1">Status</label><select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="w-full bg-gray-50 border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition">{STATUS_OPTIONS.map(o=><option key={o}>{o}</option>)}</select></div> <div><label className="block text-sm font-medium text-gray-700 mb-1">Local</label><select value={newLocation} onChange={(e) => setNewLocation(e.target.value)} className="w-full bg-gray-50 border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition">{LOCATION_OPTIONS.map(o=><option key={o}>{o}</option>)}</select></div> {newLocation === 'Terceiros' && (<div><label className="block text-sm font-medium text-gray-700 mb-1">Nome do Terceiro</label><input type="text" value={newThirdPartyName} onChange={(e) => setNewThirdPartyName(e.target.value)} placeholder="Digite o nome" className="w-full bg-gray-50 border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition" required/></div>)} <div><label className="block text-sm font-medium text-gray-700 mb-1">Previsão (Data e Hora)</label><input type="datetime-local" value={newDateTime} onChange={(e) => setNewDateTime(e.target.value)} className="w-full bg-gray-50 border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition" /></div> <div className="lg:col-span-4"><button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-4 rounded-lg transition shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-opacity-50 mt-2">Adicionar Veículo</button></div> </form> </div> {isLoading ? <Spinner /> : ( <div className="grid grid-cols-1 lg:grid-cols-3 gap-8"> <BrandColumn title="Scania" titleColor="text-blue-600" badgeBg="bg-blue-500" trucks={trucks.filter(t => t.brand === 'Scania')} renderTruckCard={renderTruckCard} /> <BrandColumn title="Volvo" titleColor="text-green-600" badgeBg="bg-green-500" trucks={trucks.filter(t => t.brand === 'Volvo')} renderTruckCard={renderTruckCard} /> <BrandColumn title="Mercedez" titleColor="text-gray-600" badgeBg="bg-gray-500" trucks={trucks.filter(t => t.brand === 'Mercedez')} renderTruckCard={renderTruckCard} /> </div> )} </div> <EditModal isOpen={isEditModalOpen} onClose={closeEditModal} onSave={handleUpdateTruck} truck={currentlyEditingTruck} userId={userId}/> </div> );
}

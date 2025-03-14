// import { useState, useEffect } from 'react';
// import { useAuth } from '../context/auth-context';
// import Layout from '../components/Layout';
// import CryptoProperty from '../components/Property/CryptoProperty';
// import PropertyDetail from '../components/Property/PropertyDetail';
// import supabase from '../lib/supabase-setup';

// export default function CryptoTest() {
//   const { user, getUserRole, refreshUserData } = useAuth();
//   const [userRoles, setUserRoles] = useState([]);
//   const [dbRoles, setDbRoles] = useState([]);
//   const [hasCryptoInvestorRole, setHasCryptoInvestorRole] = useState(false);
//   const [dummyProperty, setDummyProperty] = useState({
//     id: 'test123',
//     address: '123 Test Street',
//     city: 'Test City',
//     state: 'TS',
//     zipCode: '12345',
//     price: 1000000,
//     bedrooms: 4,
//     bathrooms: 3,
//     squareFeet: 2500,
//     image: 'https://placehold.co/800x600/1F2937/FFFFFF.png?text=Test+Property'
//   });
//   const [showTestPropertyDetail, setShowTestPropertyDetail] = useState(false);

//   // Force set crypto investor role for user
//   const forceCryptoRole = async () => {
//     if (!user?.id) return;
    
//     try {
//       // Check current roles
//       const { data } = await supabase
//         .from('users')
//         .select('roles')
//         .eq('id', user.id)
//         .single();
      
//       let roles = Array.isArray(data?.roles) ? [...data.roles] : ['user'];
      
//       // Add crypto_investor if not present
//       if (!roles.includes('crypto_investor')) {
//         roles.push('crypto_investor');
        
//         // Update database
//         await supabase
//           .from('users')
//           .update({ roles, updated_at: new Date().toISOString() })
//           .eq('id', user.id);
          
//         // Set localStorage flag
//         localStorage.setItem('cryptoInvestorSelected', 'true');
        
//         // Refresh data
//         refreshUserData(user.id);
//         setHasCryptoInvestorRole(true);
        
//         alert('Crypto investor role added successfully! Please check a property listing.');
//       } else {
//         alert('User already has crypto investor role.');
//       }
//     } catch (error) {
//       console.error('Error setting crypto role:', error);
//       alert('Failed to set crypto investor role.');
//     }
//   };to directly set the localStorage flag
// torageFlag = () => {
//   // Check current rolesstorSelected', 'true');
//   useEffect(() => { "cryptoInvestorSelected" set to true. Refresh the page to see the change.');
//     const checkRoles = async () => {ndow.location.reload(); // Force refresh to update UI
//       if (!user?.id) return;
      
//       // Check auth context roles
//       const contextRole = getUserRole();ffect(() => {
//       setHasCryptoInvestorRole(contextRole === 'crypto_investor');
      
//       // Set user roles from user object
//       setUserRoles(Array.isArray(user.roles) ? user.roles : []);
//        contextRole = getUserRole();
//       // Get roles directly from databaseole === 'crypto_investor');
//       try {
//         const { data } = await supabaseom user object
//           .from('users')rray(user.roles) ? user.roles : []);
//           .select('roles')
//           .eq('id', user.id)et roles directly from database
//           .single();
//           = await supabase
//         setDbRoles(Array.isArray(data?.roles) ? data.roles : []);
//       } catch (error) {   .select('roles')
//         console.error('Error fetching roles from DB:', error);    .eq('id', user.id)
//       }      .single();
//     };
//     sArray(data?.roles) ? data.roles : []);
//     checkRoles();      } catch (error) {
//   }, [user, getUserRole]);nsole.error('Error fetching roles from DB:', error);

//   return (
//     <Layout>
//       <div className="container mx-auto px-4 py-8">kRoles();
//         <h1 className="text-3xl font-bold mb-6">Crypto Investor Role Tester</h1>
        
//         <div className="bg-white rounded-lg shadow-md p-6 mb-8">
//           <h2 className="text-xl font-semibold mb-4">User Role Status</h2>
          
//           {!user ? (ole Tester</h1>
//             <div className="p-4 bg-yellow-100 text-yellow-700 rounded">
//               Please login to test crypto investor functionality.assName="bg-white rounded-lg shadow-md p-6 mb-8">
//             </div>emibold mb-4">User Role Status</h2>
//           ) : (
//             <div className="space-y-4">
//               <div>700 rounded">
//                 <p className="font-medium">User ID:</p> login to test crypto investor functionality.
//                 <p className="text-gray-600">{user.id}</p>div>
//               </div>
              
//               <div>
//                 <p className="font-medium">Auth Context GetUserRole():</p>lassName="font-medium">User ID:</p>
//                 <p className="text-gray-600">{getUserRole()}</p>  <p className="text-gray-600">{user.id}</p>
//               </div>>
              
//               <div>
//                 <p className="font-medium">Has Crypto Investor Role:</p>GetUserRole():</p>
//                 <p className={hasCryptoInvestorRole ? "text-green-600" : "text-red-600"}>lassName="text-gray-600">{getUserRole()}</p>
//                   {hasCryptoInvestorRole ? "YES" : "NO"}
//                 </p>
//               </div>
//               le:</p>
//               <div>vestorRole ? "text-green-600" : "text-red-600"}>
//                 <p className="font-medium">User Object Roles:</p>: "NO"}
//                 {userRoles.length > 0 ? (
//                   <ul className="list-disc ml-6">
//                     {userRoles.map(role => (
//                       <li key={role} className={role === 'crypto_investor' ? "text-green-600" : ""}>{role}</li>
//                     ))}assName="font-medium">User Object Roles:</p>
//                   </ul>
//                 ) : (<ul className="list-disc ml-6">
//                   <p className="text-red-600">No roles found in user object</p>{userRoles.map(role => (
//                 )}        <li key={role} className={role === 'crypto_investor' ? "text-green-600" : ""}>{role}</li>
//               </div> ))}
              
//               <div>
//                 <p className="font-medium">Database Roles:</p>roles found in user object</p>
//                 {dbRoles.length > 0 ? (
//                   <ul className="list-disc ml-6">
//                     {dbRoles.map(role => (
//                       <li key={role} className={role === 'crypto_investor' ? "text-green-600" : ""}>{role}</li>
//                     ))}assName="font-medium">Database Roles:</p>
//                   </ul>
//                 ) : (<ul className="list-disc ml-6">
//                   <p className="text-red-600">No roles found in database</p>{dbRoles.map(role => (
//                 )}        <li key={role} className={role === 'crypto_investor' ? "text-green-600" : ""}>{role}</li>
//               </div> ))}
              
//               <div>
//                 <p className="font-medium">localStorage Flag:</p>
//                 <p className={localStorage.getItem('cryptoInvestorSelected') === 'true' ? "text-green-600" : "text-red-600"}>
//                   {localStorage.getItem('cryptoInvestorSelected') === 'true' ? "YES" : "NO"}
//                 </p>
//               </div>
//               sName="font-medium">localStorage Flag:</p>
//               <div className="pt-4 border-t">getItem('cryptoInvestorSelected') === 'true' ? "text-green-600" : "text-red-600"}>
//                 <button
//                   onClick={forceCryptoRole}/p>
//                   className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
//                 >
//                   Force Add Crypto Investor RolelassName="pt-4 border-t space-y-4">
//                 </button>utton
//               </div>      onClick={forceCryptoRole}
//             </div>    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition mr-4"
//           )}        >
//         </div>
        
//         <div className="bg-white rounded-lg shadow-md p-6">
//           <h2 className="text-xl font-semibold mb-4">Crypto Property Preview</h2>
//           <div className="border border-dashed border-gray-300 p-4 rounded">  onClick={forceLocalStorageFlag}
//             <CryptoProperty propertyData={dummyProperty} mlsData={null} />    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
//           </div>    >
//           <div className="mt-4">     Set LocalStorage Flag
//             <button            </button>
//               onClick={() => setShowTestPropertyDetail(true)}               
//               className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition"                <p className="text-sm text-gray-500 mt-2">




















// }  );    </Layout>      </div>        </div>          )}            />              onClose={() => setShowTestPropertyDetail(false)}              property={dummyProperty}            <PropertyDetail          {showTestPropertyDetail && (          </div>            </p>              This will open the PropertyDetail modal directly to test if it correctly shows the crypto view.            <p className="text-sm text-gray-500 mt-2">            </button>              Test PropertyDetail Component            >                  After clicking either button, visit a property listing to see the crypto view.
//                 </p>
//               </div>
//             </div>
//           )}
//         </div>
        
//         <div className="bg-white rounded-lg shadow-md p-6">
//           <h2 className="text-xl font-semibold mb-4">Crypto Property Preview</h2>
//           <div className="border border-dashed border-gray-300 p-4 rounded">
//             <CryptoProperty propertyData={dummyProperty} mlsData={null} />
//           </div>
//         </div>
//       </div>
//     </Layout>
//   );
// }

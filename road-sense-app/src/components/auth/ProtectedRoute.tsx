'use client';

import { useRootStore } from '@/store';
import LoginForm from './LoginForm';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  // Use Zustand store directly for auth state
  const { user, isLoading, isAuthenticated } = useRootStore();

  // if (isLoading) {
  //   return (
  //     <div className="min-h-screen flex items-center justify-center bg-gray-50">
  //       <div className="text-center">
  //         <div className="flex justify-center items-center mb-4">
  //           <div className="w-12 h-12 bg-gradient-to-r from-red-600 to-red-800 rounded-full flex items-center justify-center">
  //             <span className="text-white font-bold text-lg">GR</span>
  //           </div>
  //         </div>
  //         <h2 className="text-xl font-semibold text-gray-700 mb-2">Toyota GR Racing</h2>
  //         <div className="flex items-center justify-center space-x-2">
  //           <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
  //           <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
  //           <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
  //         </div>
  //         <p className="text-sm text-gray-500 mt-2">Loading racing analytics...</p>
  //       </div>
  //     </div>
  //   );
  // }

  if (!user || !isAuthenticated) {
    return <LoginForm />;
  }

  return <>{children}</>;
}


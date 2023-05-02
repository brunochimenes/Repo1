import { createContext, ReactNode, useEffect, useState } from 'react';

import { api } from '@services/api';

import { UserDTO } from '@dtos/UserDTO';

import { storageUserSave, storageUserGet, storageUserRemove } from '@storage/storageUser';
import { storageAuthTokenSave, storageAuthTokenGet, storageAuthTokenRemove } from '@storage/storageAuthToken';

export type AuthContextDataProps = {
    user: UserDTO;
    refreshedToken: string;
    isLoadingUserStorageData: boolean;
    signIn: (email: string, passord: string) => Promise<void>;
    signOut: () => Promise<void>;
    updateUserProfile: (userUpdated: UserDTO) => Promise<void>;
}

type AuthContextProviderProps = {
    children: ReactNode;
}

export const AuthContext = createContext<AuthContextDataProps>({} as AuthContextDataProps);

export function AuthContextProvider({ children }: AuthContextProviderProps) {
  const [refreshedToken, setRefreshedToken] = useState('');
  const [ user, setUser ] = useState<UserDTO>({} as UserDTO);
  const [isLoadingUserStorageData, setIsLoadingUserStorageData] = useState(true);

  async function userAndTokenUpdate(userData: UserDTO, token: string) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      setUser(userData);
  }

  async function storageUserAndTokenSave(userData: UserDTO, token: string, refresh_token: string) {
    try {
      setIsLoadingUserStorageData(true);

      await storageUserSave(userData);

      await storageAuthTokenSave({token, refresh_token});
    } catch (error) {
      throw error;
    } finally {
      setIsLoadingUserStorageData(false);
    }
  }

  async function signIn(email: string, password: string) {
    try {
      const response = await api.post('/sessions', {email, password});

      if(response.data.user && response.data.token && response.data.refresh_token) {
        await storageUserAndTokenSave(response.data.user, response.data.token, response.data.refresh_token);

        userAndTokenUpdate(response.data.user, response.data.token);
      }
    } catch (error) {
      throw error;
    }
  }

  async function signOut() {
    try {
      setIsLoadingUserStorageData(true);

      setUser({} as UserDTO);

      await storageUserRemove();

      await storageAuthTokenRemove();
    } catch (error) {
      throw error;
    } finally {
      setIsLoadingUserStorageData(false);
    }
  }

  async function updateUserProfile(userUpdated: UserDTO) {
    try {
      setUser(userUpdated);
      
      await storageUserSave(userUpdated);
    } catch (error) {
      throw error;
    }
  }

  async function loadUserData() {
    try {
      setIsLoadingUserStorageData(true);

      const userLogged = await storageUserGet();
      const { token } = await storageAuthTokenGet();

      if(token && userLogged) {
        userAndTokenUpdate(userLogged, token);
      } 
    } catch (error) {
      throw error;
    } finally {
        setIsLoadingUserStorageData(false);
    }
  }
  
  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    const subscribe = api.registerInterceptTokenManager(signOut);

    return () => {
      subscribe();
    }
  }, [signOut]);

  return (
        <AuthContext.Provider value={{ 
          user, 
          signIn, 
          signOut, 
          isLoadingUserStorageData, 
          updateUserProfile,
          refreshedToken
        }}>
            {children}
          </AuthContext.Provider>
    )
}

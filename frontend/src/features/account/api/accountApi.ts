import * as WailsAccount from '@bindings/dn-wails/internal/account/models'
import {
  ChangePassword,
  GetAuthState,
  GetProfile,
  ImportAvatar,
  LoginUser,
  LogoutUser,
  RegisterUser,
  UpdateProfile,
} from '@bindings/dn-wails/internal/application/app'

export interface Profile {
  id: number
  account: string
  name: string
  email: string
  role: number
  status: number
  avatar: string
  createdAt: string
}

export interface ProfileInput {
  name: string
  email: string
  avatar: string
}

export interface AuthState {
  authenticated: boolean
  user: Profile | null
}

export interface RegistrationInput {
  account: string
  email: string
  password: string
}

export interface LoginInput {
  login: string
  password: string
}

export interface PasswordInput {
  currentPassword: string
  newPassword: string
}

export async function getAuthState(): Promise<AuthState> {
  const state = await GetAuthState()
  return { authenticated: state.authenticated, user: state.user ?? null }
}

export function registerUser(input: RegistrationInput): Promise<Profile> {
  return RegisterUser(WailsAccount.RegistrationInput.createFrom(input))
}

export function loginUser(input: LoginInput): Promise<Profile> {
  return LoginUser(WailsAccount.LoginInput.createFrom(input))
}

export function logoutUser(): Promise<void> {
  return LogoutUser()
}

export function getProfile(): Promise<Profile> {
  return GetProfile()
}

export function updateProfile(input: ProfileInput): Promise<Profile> {
  return UpdateProfile(WailsAccount.ProfileInput.createFrom(input))
}

export function changePassword(input: PasswordInput): Promise<void> {
  return ChangePassword(WailsAccount.PasswordInput.createFrom(input))
}

export function importAvatar(path: string): Promise<string> {
  return ImportAvatar(path)
}

export function getAccountErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback
}

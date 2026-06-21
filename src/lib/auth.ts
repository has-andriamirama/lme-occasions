// src/lib/auth.ts
import { NextAuthOptions, getServerSession } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/db'

const MAX_LOGIN_ATTEMPTS = 5
const LOCKOUT_WINDOW_MINUTES = 15

export const authOptions: NextAuthOptions = {
	session: { strategy: 'jwt', maxAge: 8 * 60 * 60 }, // 8h
	pages: {
		signIn: '/login',
		error: '/login',
	},
	callbacks: {
		async jwt({ token, user, trigger, session }) {
			if (user) {
				token.id = user.id
				token.role = (user as any).role
				token.mustChangePassword = (user as any).mustChangePassword
				token.username = (user as any).username
			}

			if (trigger === 'update' && session) {
				if (typeof session.mustChangePassword === 'boolean') {
					token.mustChangePassword = session.mustChangePassword
				}
			}

			return token
		},
		async session({ session, token }) {
			if (token) {
				session.user.id = token.id as string
				session.user.role = token.role as string
				session.user.mustChangePassword = token.mustChangePassword as boolean
				session.user.username = token.username as string
			}
			return session
		},
	},
	providers: [
		CredentialsProvider({
			name: 'Credentials',
			credentials: {
				username: { label: 'Username', type: 'text' },
				password: { label: 'Password', type: 'password' },
			},
			async authorize(credentials, req) {
				if (!credentials?.username || !credentials?.password) {
					throw new Error('Identifiant et mot de passe requis')
				}

				const ip = req?.headers?.['x-forwarded-for'] as string | undefined

				const windowStart = new Date(Date.now() - LOCKOUT_WINDOW_MINUTES * 60 * 1000)
				const recentFailures = await prisma.loginAttempt.count({
					where: {
						username: credentials.username,
						success: false,
						createdAt: { gte: windowStart },
					},
				})

				if (recentFailures >= MAX_LOGIN_ATTEMPTS) {
					throw new Error(
						`Trop de tentatives. Réessayez dans ${LOCKOUT_WINDOW_MINUTES} minutes.`
					)
				}

				const admin = await prisma.admin.findFirst({
					where: {
						OR: [
							{ username: credentials.username },
							{ email: credentials.username },
						],
						isActive: true,
					},
				})

				if (!admin) {
					await prisma.loginAttempt.create({
						data: { username: credentials.username, ip, success: false },
					})
					throw new Error('Identifiant ou mot de passe incorrect')
				}

				const isValid = await bcrypt.compare(credentials.password, admin.password)

				if (!isValid) {
					await prisma.loginAttempt.create({
						data: { username: credentials.username, ip, success: false, adminId: admin.id },
					})
					throw new Error('Identifiant ou mot de passe incorrect')
				}

				await Promise.all([
					prisma.loginAttempt.create({
						data: { username: credentials.username, ip, success: true, adminId: admin.id },
					}),
					prisma.admin.update({
						where: { id: admin.id },
						data: { lastLoginAt: new Date() },
					}),
				])

				return {
					id: admin.id,
					name: admin.username,
					email: admin.email,
					role: admin.role,
					mustChangePassword: admin.mustChangePassword,
					username: admin.username,
				}
			},
		}),
	],
}

export async function getAuth() {
	return getServerSession(authOptions)
}

export async function requireAuth() {
	const session = await getAuth()
	if (!session?.user) return null
	return session
}

export function validatePassword(password: string): {
	valid: boolean
	errors: string[]
} {
	const errors: string[] = []
	if (password.length < 8) errors.push('Au moins 8 caractères')
	if (!/[A-Z]/.test(password)) errors.push('Au moins une majuscule')
	if (!/[a-z]/.test(password)) errors.push('Au moins une minuscule')
	if (!/[0-9]/.test(password)) errors.push('Au moins un chiffre')
	if (!/[^A-Za-z0-9]/.test(password)) errors.push('Au moins un caractère spécial')
	return { valid: errors.length === 0, errors }
}

export async function hashPassword(password: string): Promise<string> {
	return bcrypt.hash(password, 12)
}

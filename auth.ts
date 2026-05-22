import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"

const admins = JSON.parse(process.env.ADMIN_USERS!)

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const admin = admins.find((a: any) => a.email === credentials.email)
        if (!admin) return null
        const valid = await bcrypt.compare(credentials.password as string, admin.password)
        return valid ? { id: admin.email, email: admin.email } : null
      },
    }),
  ],
  pages: { signIn: "/login" },
})
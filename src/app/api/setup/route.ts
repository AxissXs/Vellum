import { NextResponse } from "next/server";
import { hashSync } from "bcryptjs";
import { db } from "@/db";
import { users, teams, teamMembers, projects } from "@/db/schema";

export async function POST(req: Request) {
  try {
    const { name, email, password, teamName } = await req.json();

    if (!name || !email || !password || !teamName) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const existingUsers = await db.select({ count: users.id }).from(users).limit(1);
    if (existingUsers.length > 0) {
      return NextResponse.json({ error: "Workspace already initialized" }, { status: 400 });
    }

    const passwordHash = hashSync(password, 10);

    const insertedUser = await db
      .insert(users)
      .values({
        name,
        email: email.toLowerCase(),
        passwordHash,
        role: "superadmin",
        avatarUrl: "",
      })
      .returning({ id: users.id });

    const userId = insertedUser[0].id;

    const insertedTeam = await db
      .insert(teams)
      .values({
        name: teamName,
        description: "Default team created during setup",
      })
      .returning({ id: teams.id });

    const teamId = insertedTeam[0].id;

    await db.insert(teamMembers).values({
      teamId,
      userId,
      teamRole: "lead",
    });

    await db.insert(projects).values({
      name: "Getting Started",
      description: "Welcome to Vellum! This is your first project to explore the platform.",
      color: "#6366f1",
      icon: "layout-dashboard",
      ownerId: userId,
    });

    return NextResponse.json({ success: true, userId });
  } catch (error) {
    console.error("Setup error:", error);
    return NextResponse.json({ error: "Failed to create workspace" }, { status: 500 });
  }
}

export async function GET() {
  const existingUsers = await db.select({ count: users.id }).from(users).limit(1);
  return NextResponse.json({ initialized: existingUsers.length > 0 });
}
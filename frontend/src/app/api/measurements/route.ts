import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return bad("Not authenticated", 401);
  }

  const body = await req.json().catch(() => null);
  const fieldsJson = body?.fieldsJson;
  const projectId =
    typeof body?.projectId === "string" && body.projectId.trim()
      ? body.projectId.trim()
      : null;

  if (!fieldsJson || typeof fieldsJson !== "object" || Array.isArray(fieldsJson)) {
    return bad("fieldsJson must be an object");
  }

  // Optional guard:
  // if the frontend submits a projectId, block updates for locked projects.
  if (projectId) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        customerId: true,
        projectMeasurementGate: {
          select: {
            lockedAt: true,
          },
        },
      },
    });

    if (!project) {
      return bad("Project not found", 404);
    }

    if (project.customerId !== session.user.id) {
      return bad("Forbidden", 403);
    }

    if (project.projectMeasurementGate?.lockedAt) {
      return bad("Measurements are locked for this project.");
    }
  }

  const measurement = await prisma.measurement.create({
    data: {
      customerId: session.user.id,
      fieldsJson,
    },
  });

  return NextResponse.json({ ok: true, measurement });
}
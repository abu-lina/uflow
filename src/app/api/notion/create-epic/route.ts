import { NextResponse } from 'next/server';
import { createEpic, type CreateEpicInput, type MoSCoW } from '@/lib/notion/epicHelpers';

/**
 * POST /api/notion/create-epic
 * 
 * Create a new epic in the Notion Epics database
 * 
 * Request body:
 * {
 *   name: string (required)
 *   description?: string (optional)
 *   moscow?: "Must have" | "Should have" | "Could have" | "Won't have" (optional)
 *   status?: "Not started" | "In progress" | "Done" (optional, defaults to "Not started")
 *   targetDelivery?: string (optional, ISO date string)
 *   labels?: string[] (optional)
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, moscow, status, targetDelivery, labels } = body as CreateEpicInput;

    // Validation
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Name is required and must be a string' },
        { status: 400 }
      );
    }

    if (moscow && !['Must have', 'Should have', 'Could have', "Won't have"].includes(moscow)) {
      return NextResponse.json(
        { error: 'Invalid MoSCoW value. Must be one of: Must have, Should have, Could have, Won\'t have' },
        { status: 400 }
      );
    }

    // Create epic
    const epic = await createEpic({
      name,
      description,
      moscow: moscow as MoSCoW | undefined,
      status: status || 'Not started',
      targetDelivery,
      labels,
    });

    return NextResponse.json({
      success: true,
      epic: {
        id: epic.id,
        url: epic.url,
      },
    });
  } catch (error) {
    console.error('Error creating Notion epic:', error);
    return NextResponse.json(
      {
        error: 'Failed to create epic',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}



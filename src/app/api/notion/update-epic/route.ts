import { NextResponse } from 'next/server';
import { updateEpic } from '@/lib/notion/epicHelpers';
import type { UpdateEpicInput } from '@/lib/notion/epicHelpers';

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { epicId, ...updateInput } = body;

    if (!epicId || typeof epicId !== 'string') {
      return NextResponse.json(
        { error: 'Epic ID is required and must be a string' },
        { status: 400 }
      );
    }

    const epic = await updateEpic(epicId, updateInput as UpdateEpicInput);

    return NextResponse.json({
      success: true,
      epic: {
        id: epic.id,
        url: epic.url,
      },
    });
  } catch (error) {
    console.error('Error updating Notion epic:', error);
    return NextResponse.json(
      { error: 'Failed to update epic', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}




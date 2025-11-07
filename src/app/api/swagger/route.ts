import { NextResponse } from 'next/server';

/**
 * GET /api/swagger
 * 
 * Returns the OpenAPI/Swagger specification for the API
 */
export async function GET() {
  try {
    // Dynamic import to avoid issues in production
    const { createSwaggerSpec } = await import('next-swagger-doc');

    const spec = createSwaggerSpec({
      definition: {
        openapi: '3.0.0',
        info: {
          title: 'UFLOW API Documentation',
          version: '1.0.0',
          description: 'API documentation for UFLOW - Community Services Platform',
          contact: {
            name: 'API Support',
            email: 'support@ummahflow.com',
          },
        },
        servers: [
          {
            url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
            description: 'Development server',
          },
          {
            url: 'https://ummahflow.com',
            description: 'Production server',
          },
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
            },
            cookieAuth: {
              type: 'apiKey',
              in: 'cookie',
              name: 'sb-access-token',
            },
          },
        },
      },
      apiFolder: 'src/app/api',
    });

    return NextResponse.json(spec);
  } catch (error) {
    console.error('Error generating Swagger spec:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate API documentation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}


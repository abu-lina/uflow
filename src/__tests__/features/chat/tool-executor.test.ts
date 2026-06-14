import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockRpcSearch } = vi.hoisted(() => ({
  mockRpcSearch: vi.fn(),
}));

const mockSupabase = {
  rpc: mockRpcSearch,
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  ilike: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn(),
  insert: vi.fn().mockReturnValue({ error: null }),
  delete: vi.fn().mockReturnThis(),
};

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(() => mockSupabase),
}));

// Also mock the client-side supabase for providerService
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
    insert: vi.fn().mockReturnValue({ error: null }),
    delete: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    rpc: vi.fn(),
    storage: {
      from: vi.fn().mockReturnThis(),
      upload: vi.fn(),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://test.com/img.jpg' } }),
    },
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
  },
}));

vi.mock('@/services/providers', () => ({
  getProviderById: vi.fn(),
  fetchProviderCities: vi.fn(),
  checkCityExists: vi.fn(),
  searchProviders: vi.fn(),
}));

import { executeToolCall, TOOL_DEFINITIONS } from '@/features/chat/services/tool-executor';
import type { ToolCall } from '@/features/chat/types';
import { getProviderById, fetchProviderCities, checkCityExists } from '@/services/providers';

describe('Tool Executor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('TOOL_DEFINITIONS', () => {
    it('defines all required tools', () => {
      const toolNames = TOOL_DEFINITIONS.map((t) => t.function.name);
      expect(toolNames).toContain('search_providers');
      expect(toolNames).toContain('get_provider_details');
      expect(toolNames).toContain('get_categories');
      expect(toolNames).toContain('get_cities');
      expect(toolNames).toContain('register_provider');
    });

    it('each tool has valid type and function shape', () => {
      for (const tool of TOOL_DEFINITIONS) {
        expect(tool.type).toBe('function');
        expect(tool.function.name).toBeTruthy();
        expect(tool.function.description).toBeTruthy();
        expect(tool.function.parameters.type).toBe('object');
      }
    });
  });

  describe('executeToolCall', () => {
    it('throws for unknown tool name', async () => {
      const toolCall: ToolCall = {
        id: 'call_1',
        type: 'function',
        function: { name: 'nonexistent_tool', arguments: '{}' },
      };

      await expect(executeToolCall(toolCall)).rejects.toThrow(
        'Unknown tool: nonexistent_tool',
      );
    });

    describe('get_cities', () => {
      it('calls fetchProviderCities', async () => {
        const mockCities = ['Berlin', 'Köln', 'München'];
        vi.mocked(fetchProviderCities).mockResolvedValue(mockCities);

        const toolCall: ToolCall = {
          id: 'call_1',
          type: 'function',
          function: { name: 'get_cities', arguments: '{}' },
        };

        const result = await executeToolCall(toolCall);
        const parsed = JSON.parse(result);

        expect(fetchProviderCities).toHaveBeenCalled();
        expect(parsed.cities).toEqual(mockCities);
      });
    });

    describe('get_provider_details', () => {
      it('calls getProviderById with parsed arguments', async () => {
        const mockProvider = {
          provider_id: 'prov-123',
          provider_name: 'Test Restaurant',
          address_city: 'Berlin',
        };
        vi.mocked(getProviderById).mockResolvedValue(mockProvider as never);

        const toolCall: ToolCall = {
          id: 'call_2',
          type: 'function',
          function: {
            name: 'get_provider_details',
            arguments: JSON.stringify({ provider_id: 'prov-123' }),
          },
        };

        const result = await executeToolCall(toolCall);
        const parsed = JSON.parse(result);

        expect(getProviderById).toHaveBeenCalledWith('prov-123');
        expect(parsed.provider_id).toBe('prov-123');
      });

      it('throws if provider_id is missing', async () => {
        const toolCall: ToolCall = {
          id: 'call_3',
          type: 'function',
          function: {
            name: 'get_provider_details',
            arguments: '{}',
          },
        };

        await expect(executeToolCall(toolCall)).rejects.toThrow(
          'provider_id is required',
        );
      });
    });

    describe('get_categories', () => {
      it('queries categories table', async () => {
        const mockCategories = [
          { category_id: 'cat-1', name_de: 'Türkisch' },
          { category_id: 'cat-2', name_de: 'Arabisch' },
        ];

        mockSupabase.maybeSingle.mockResolvedValue({ data: null, error: null });
        mockSupabase.limit.mockReturnValue({ data: mockCategories, error: null });

        const toolCall: ToolCall = {
          id: 'call_4',
          type: 'function',
          function: {
            name: 'get_categories',
            arguments: JSON.stringify({ listing_type: 'food' }),
          },
        };

        const result = await executeToolCall(toolCall);
        const parsed = JSON.parse(result);

        expect(parsed.categories).toEqual(mockCategories);
      });
    });

    describe('search_providers', () => {
      it('calls search_providers_chat RPC with parsed arguments', async () => {
        const mockResults = [
          {
            provider_id: 'p1',
            provider_name: 'Döner Haus',
            address_city: 'Berlin',
            category_name: 'Türkisch',
          },
        ];

        mockRpcSearch.mockResolvedValue({
          data: mockResults,
          error: null,
        });

        const toolCall: ToolCall = {
          id: 'call_5',
          type: 'function',
          function: {
            name: 'search_providers',
            arguments: JSON.stringify({
              query: 'Döner',
              city: 'Berlin',
              listing_type: 'food',
              limit: 5,
            }),
          },
        };

        const result = await executeToolCall(toolCall);
        const parsed = JSON.parse(result);

        expect(mockRpcSearch).toHaveBeenCalledWith('search_providers_chat', {
          p_search_query: 'Döner',
          p_category_filter: null,
          p_city_filter: 'Berlin',
          p_listing_type_filter: 'food',
          p_muslim_owned: null,
          p_has_prayer_space: null,
          p_family_friendly: null,
          p_women_friendly: null,
          p_limit_count: 5,
        });
        expect(parsed.results).toHaveLength(1);
        expect(parsed.results[0].provider_name).toBe('Döner Haus');
      });

      it('throws if query is missing', async () => {
        const toolCall: ToolCall = {
          id: 'call_6',
          type: 'function',
          function: {
            name: 'search_providers',
            arguments: '{}',
          },
        };

        await expect(executeToolCall(toolCall)).rejects.toThrow(
          'query is required',
        );
      });
    });

    describe('register_provider', () => {
      it('validates required fields', async () => {
        const toolCall: ToolCall = {
          id: 'call_7',
          type: 'function',
          function: {
            name: 'register_provider',
            arguments: JSON.stringify({
              name: 'Test Restaurant',
              listing_type: 'food',
              category_id: 'cat-1',
              city: 'Berlin',
            }),
          },
        };

        vi.mocked(checkCityExists).mockResolvedValue(true);

        const result = await executeToolCall(toolCall, 'user-123');
        const parsed = JSON.parse(result);

        expect(checkCityExists).toHaveBeenCalledWith('Berlin');
        expect(parsed.success).toBe(true);
        expect(parsed.review_status).toBe('pending');
      });

      it('rejects invalid listing_type', async () => {
        const toolCall: ToolCall = {
          id: 'call_8',
          type: 'function',
          function: {
            name: 'register_provider',
            arguments: JSON.stringify({
              name: 'Test',
              listing_type: 'invalid',
              category_id: 'cat-1',
              city: 'Berlin',
            }),
          },
        };

        await expect(executeToolCall(toolCall, 'user-123')).rejects.toThrow(
          'listing_type must be one of: food, store, ummah',
        );
      });

      it('rejects registration when city does not exist', async () => {
        vi.mocked(checkCityExists).mockResolvedValue(false);

        const toolCall: ToolCall = {
          id: 'call_9',
          type: 'function',
          function: {
            name: 'register_provider',
            arguments: JSON.stringify({
              name: 'Test',
              listing_type: 'food',
              category_id: 'cat-1',
              city: 'FakeCity',
            }),
          },
        };

        await expect(executeToolCall(toolCall, 'user-123')).rejects.toThrow(
          'City "FakeCity" not found',
        );
      });

      it('[G3] maps chat args to typed registration form data', async () => {
        const { mapChatArgsToFormData } = await import(
          '@/features/chat/services/tool-executor'
        );

        const args = {
          name: 'Test Restaurant',
          listing_type: 'food',
          category_id: 'cat-1',
          city: 'Berlin',
          phone: '+4930123456',
          muslim_owned: true,
        };

        const result = mapChatArgsToFormData(args, 'user-123');

        expect(result.formData.title).toBe('Test Restaurant');
        expect(result.formData.category).toBe('cat-1');
        expect(result.formData.city).toBe('Berlin');
        expect(result.formData.phone).toBe('+4930123456');
        expect(result.formData.tags).toContain('muslim');
        expect(result.formData.creationMode).toBe('owner');
        expect(result.formData.entityType).toBe('provider');
        expect(result.formData.isOnlineBusiness).toBe(false);
        expect(result.formData.showAddress).toBe(true);
        expect(result.formData.country).toBe('DE');
        expect(result.user.id).toBe('user-123');
      });

      it('[G3] validates that formData has all required ProviderFormData fields', async () => {
        const { mapChatArgsToFormData } = await import(
          '@/features/chat/services/tool-executor'
        );

        const args = {
          name: 'Minimal Store',
          listing_type: 'store',
          category_id: 'cat-2',
          city: 'Köln',
        };

        const result = mapChatArgsToFormData(args, 'user-456');

        const requiredFields = [
          'creationMode', 'entityType', 'title', 'category', 'description',
          'isOnlineBusiness', 'street', 'zip', 'city', 'country', 'showAddress',
          'website', 'instagram', 'phone', 'email', 'offers_ids', 'needs_ids',
          'images', 'selectedCommunityServiceIds', 'tags',
          'socialCategory', 'socialTitle', 'socialDescription',
        ] as const;

        for (const field of requiredFields) {
          expect(result.formData).toHaveProperty(field);
        }
      });
    });
  });
});

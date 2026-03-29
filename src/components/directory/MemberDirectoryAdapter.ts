import type { DataAdapter } from '@lib/listing/adapters/types';
import type { FetchParams, FetchResult, SortConfig } from '@lib/listing/types';
import type { MemberProfile } from '@/types/member';
import { getMemberProfiles } from '@/lib/members';

/**
 * Domain-specific data adapter for the MemberDirectory listing.
 *
 * Handles text search across nested MemberProfile fields, domain-specific
 * filter matching (skills, companies, locations, experience, availability,
 * boolean flags), and multi-field sorting.
 */
export class MemberDirectoryAdapter implements DataAdapter<MemberProfile> {
  private cache: MemberProfile[] | null = null;
  private memberType: 'all' | 'member' | 'collaborator';
  private maxMembers: number;

  constructor(
    memberType: 'all' | 'member' | 'collaborator',
    maxMembers: number
  ) {
    this.memberType = memberType;
    this.maxMembers = maxMembers;
  }

  invalidate(): void {
    this.cache = null;
  }

  async fetch(params: FetchParams): Promise<FetchResult<MemberProfile>> {
    const allItems = await this.loadData();
    let filtered = [...allItems];

    if (params.query?.trim()) {
      filtered = this.applySearch(filtered, params.query.trim());
    }

    if (params.filters) {
      filtered = this.applyFilters(filtered, params.filters);
    }

    if (params.sort) {
      filtered = this.applySort(filtered, params.sort);
    }

    const totalCount = filtered.length;
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 12;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const items = filtered.slice(startIndex, endIndex);
    const hasMore = endIndex < totalCount;

    return { items, totalCount, hasMore };
  }

  private async loadData(): Promise<MemberProfile[]> {
    if (this.cache) return this.cache;
    this.cache = await getMemberProfiles({
      filters: { memberType: this.memberType },
      limit: this.maxMembers,
    });
    return this.cache;
  }

  // Visible for testing
  applySearch(items: MemberProfile[], query: string): MemberProfile[] {
    const lower = query.toLowerCase();
    return items.filter((m) => {
      const searchable = [
        m.displayName,
        m.profile?.company,
        m.profile?.position,
        m.profile?.location,
        ...m.featuredSkills,
        ...m.searchableKeywords,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return searchable.includes(lower);
    });
  }

  // Visible for testing
  applyFilters(
    items: MemberProfile[],
    filters: Record<string, unknown>
  ): MemberProfile[] {
    return items.filter((member) => {
      for (const [key, value] of Object.entries(filters)) {
        if (value === undefined || value === null || value === '') continue;
        if (Array.isArray(value) && value.length === 0) continue;

        switch (key) {
          case 'skills': {
            const filterSkills = value as string[];
            const memberSkills = [
              ...member.featuredSkills,
              ...member.profile.skills,
            ].map((s) => s.toLowerCase());
            if (
              !filterSkills.some((fs) =>
                memberSkills.some((ms) => ms.includes(fs.toLowerCase()))
              )
            ) {
              return false;
            }
            break;
          }
          case 'companies': {
            const filterCompanies = value as string[];
            if (
              !filterCompanies.some(
                (c) =>
                  member.profile?.company
                    ?.toLowerCase()
                    .includes(c.toLowerCase())
              )
            ) {
              return false;
            }
            break;
          }
          case 'locations': {
            const filterLocations = value as string[];
            if (
              !filterLocations.some(
                (loc) =>
                  member.profile?.location
                    ?.toLowerCase()
                    .includes(loc.toLowerCase())
              )
            ) {
              return false;
            }
            break;
          }
          case 'experienceLevel': {
            const filterLevels = value as string[];
            if (!filterLevels.includes(member.experience?.level)) {
              return false;
            }
            break;
          }
          case 'industries': {
            const filterIndustries = value as string[];
            const memberIndustries = member.experience?.industries ?? [];
            if (
              !filterIndustries.some((ind) =>
                memberIndustries.some((mi) =>
                  mi.toLowerCase().includes(ind.toLowerCase())
                )
              )
            ) {
              return false;
            }
            break;
          }
          case 'availability': {
            const filterAvail = value as string[];
            for (const av of filterAvail) {
              if (
                av === 'mentoring' &&
                !member.networking?.availableForMentoring
              )
                return false;
              if (
                av === 'opportunities' &&
                !member.networking?.openToOpportunities
              )
                return false;
              if (
                av === 'networking' &&
                member.networking?.mentorshipStatus === 'none'
              )
                return false;
            }
            break;
          }
          case 'onlineStatus':
            if (value === true && !member.isOnline) return false;
            break;
          case 'hasPortfolio':
            if (
              value === true &&
              (!member.portfolio || member.portfolio.projects.length === 0)
            )
              return false;
            break;
          case 'isPremium':
            if (value === true && !member.isPremium) return false;
            break;
          case 'joinedAfter': {
            const dateValue =
              value instanceof Date ? value : new Date(String(value));
            if (member.joinedAt < dateValue) return false;
            break;
          }
          default:
            break;
        }
      }
      return true;
    });
  }

  // Visible for testing
  applySort(items: MemberProfile[], sort: SortConfig): MemberProfile[] {
    const multiplier = sort.direction === 'desc' ? -1 : 1;
    return [...items].sort((a, b) => {
      switch (sort.field) {
        case 'name':
          return multiplier * a.displayName.localeCompare(b.displayName);
        case 'reputation':
          return (
            multiplier *
            ((a.activity?.reputation ?? 0) - (b.activity?.reputation ?? 0))
          );
        case 'activity': {
          const aTime = a.activity?.lastActive?.getTime?.() ?? 0;
          const bTime = b.activity?.lastActive?.getTime?.() ?? 0;
          return multiplier * (aTime - bTime);
        }
        case 'joinDate':
        default: {
          const aTime = a.joinedAt?.getTime?.() ?? 0;
          const bTime = b.joinedAt?.getTime?.() ?? 0;
          return multiplier * (aTime - bTime);
        }
      }
    });
  }
}

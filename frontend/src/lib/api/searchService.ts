export interface SearchResultItem {
  id: number;
  type: "product" | "customer" | "supplier" | "sale" | "purchase";
  name?: string; // For Product, Customer, Supplier
  product_code?: string; // For Product
  phone?: string; // For Customer, Supplier
  reference_no?: string; // For Sale, Purchase
  total_amount?: number; // For Sale, Purchase
}

export interface SearchResults {
  products?: SearchResultItem[];
  customers?: SearchResultItem[];
  suppliers?: SearchResultItem[];
  sales?: SearchResultItem[];
  purchases?: SearchResultItem[];
}

const BASE_URL = "http://localhost:5000/api";

class SearchService {
  private getBaseUrl(): string {
    const storedUrl = localStorage.getItem("serverUrl");
    return storedUrl ? `${storedUrl}/api` : BASE_URL;
  }

  async globalSearch(query: string): Promise<SearchResults> {
    const token = localStorage.getItem("authToken");
    const url = `${this.getBaseUrl()}/search?q=${encodeURIComponent(query)}`;

    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      throw new Error("Search failed");
    }

    const data = await response.json();
    return data.results || {};
  }
}

export default new SearchService();

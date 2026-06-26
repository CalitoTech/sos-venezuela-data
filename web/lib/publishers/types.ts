export interface PublishInput {
  full_name: string;
  cedula: string | null;
  age: number | null;
  gender: "male" | "female" | null;
  last_seen_location: string | null;
  description: string | null;
  photo_url: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  status: "missing" | "found";
  status_notes: string | null;
  found_by: string | null;
  found_contact: string | null;
  found_hospital: string | null;
}

export interface PublishResult {
  platform: string;
  action: "created" | "updated" | "skipped" | "error";
  external_id?: string;
  error?: string;
}

export interface Publisher {
  name: string;
  sourceUrl: string;
  search(input: PublishInput): Promise<string | null>;
  create(input: PublishInput): Promise<string>;
  update?(externalId: string, input: PublishInput): Promise<void>;
}

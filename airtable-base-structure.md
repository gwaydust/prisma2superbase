# Airtable Base Structure: Prisma-to-Supabase Outreach

## Copy This Structure to Your Airtable Workspace

### Table 1: Prospects
| Field Name | Type | Options |
|------------|------|---------|
| Name | Single line text | (e.g., "john-doe/awesome-app") |
| Company | Single line text | (from GitHub org or profile) |
| Email | Email | (from GitHub profile if public) |
| Twitter | URL | (format: https://twitter.com/username) |
| LinkedIn | URL | (format: https://linkedin.com/in/username) |
| Pain Point | Long text | (why they need prisma-to-supabase) |
| Source Repo | URL | (GitHub repo URL) |
| Status | Single select | **To Contact**, **Contacted**, **Replied**, **Call Booked**, **Not Interested**, **Closed Lost** |
| Last Contact Date | Date | |
| Next Action | Single line text | (e.g., "Follow up Thursday", "Schedule call") |
| Outreach Count | Number | (auto-count from Outreach Log) |
| Tags | Multiple select | `prisma`, `supabase`, `nextjs`, `typescript`, `docker`, `ci-cd` |
| Priority | Single select | `High`, `Medium`, `Low` |
| Notes | Long text | |

**Views to Create:**
1. **Kanban by Status** (To Contact → Contacted → Replied → Call Booked)
2. **Grid: Not Contacted This Week** (Filter: Status = "To Contact" AND Last Contact Date ≠ this week)
3. **Calendar by Next Action Date**
4. **Grid: High Priority** (Filter: Priority = "High")

---

### Table 2: Outreach Log
| Field Name | Type | Options |
|------------|------|---------|
| Prospect | Link to Prospects | (link to Table 1, allow multiple) |
| Date | Date | (include time) |
| Channel | Single select | `Email`, `Twitter DM`, `LinkedIn`, `GitHub Issue`, `Other` |
| Template Used | Single select | `Template A: Technical`, `Template B: Business`, `Template C: Short` |
| Subject/Preview | Single line text | |
| Response | Long text | |
| Response Status | Single select | `No Response`, `Opened`, `Clicked`, `Replied Positive`, `Replied Negative`, `Unsubscribed` |
| Sent By | Single line text | (your name/initials) |

**Views:**
- **Grid: All Outreach** (sorted by Date desc)
- **Grid: By Channel** (group by Channel)

---

### Table 3: Calls
| Field Name | Type | Options |
|------------|------|---------|
| Prospect | Link to Prospects | (link to Table 1, single) |
| Date | Date | (include time) |
| Duration (min) | Number | |
| Recording URL | URL | (if recorded) |
| Notes | Long text | |
| Outcome | Single select | `Discovery`, `Demo`, `Proposal Sent`, `Closed Won`, `Closed Lost`, `Follow-up Needed` |
| Follow-up Date | Date | |
| Follow-up Action | Single line text | |

---

### Automations to Set Up (Airtable Native)
1. **When Prospect Status = "Call Booked"** → Create record in Calls table with Prospect linked
2. **When Outreach Log Response Status = "Replied Positive"** → Update Prospect Status to "Replied"
3. **Daily at 8 AM** → Send Slack/email digest: "X prospects need follow-up today"

---

### Quick Setup (2 minutes)
1. Open this base in Airtable: [Your base link will go here]
2. Click **"Copy base"** → Select your workspace
3. Rename to **"Prisma-to-Supabase Outreach"**
4. Go to **Automations** tab → Turn on the 3 automations
5. Import `prospects.csv` into Prospects table (File → Import CSV)
5. Import `tracking-template.csv` into Outreach Log (optional)
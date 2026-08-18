export interface UserSession {
  username: string;
  role: "DATA_ADMIN" | "CREDIT_OFFICER" | string;
  access_token: string;
}

export type BridgeKind = 
  | "NONE"
  | "INDIV_RELATIVE_TO_CORP"       // Người thân trung gian làm lãnh đạo/cổ đông tại DN đích
  | "CORP_F1_SUBSIDIARY"          // Công ty con F1 trung gian
  | "CORP_COMMON_PARENT"          // Công ty mẹ chung
  | "CORP_PARENT_MANAGER_BRIDGE"  // Công ty mẹ của người quản lý
  | "CORP_LEADER_FAMILY_BRIDGE";  // Lãnh đạo/cổ đông của DN vay là cầu nối tới người thân

export interface RelationOptionMeta {
  label: string;
  point: "a" | "b" | "c" | "d" | "đ" | "e";
  tier: "mandatory" | "risk_based";
  target_type: "INDIVIDUAL" | "ORGANIZATION";
  requires_percentage: boolean;
  bridge_kind: BridgeKind;
  bridge_title?: string;
  target_pct_label?: string;
}

// 1. TAXONOMY CHO KHÁCH HÀNG CÁ NHÂN
export const INDIVIDUAL_RELATION_TAXONOMY: { group: string; options: RelationOptionMeta[] }[] = [
  {
    group: "1. Quan hệ Gia đình / Huyết thống (Trực tiếp 0-Hop - Điểm d)",
    options: [
      { label: "Vợ/chồng", point: "d", tier: "mandatory", target_type: "INDIVIDUAL", requires_percentage: false, bridge_kind: "NONE" },
      { label: "Cha mẹ đẻ / Cha mẹ nuôi", point: "d", tier: "mandatory", target_type: "INDIVIDUAL", requires_percentage: false, bridge_kind: "NONE" },
      { label: "Cha dượng / Mẹ kế", point: "d", tier: "mandatory", target_type: "INDIVIDUAL", requires_percentage: false, bridge_kind: "NONE" },
      { label: "Cha mẹ vợ / Cha mẹ chồng", point: "d", tier: "mandatory", target_type: "INDIVIDUAL", requires_percentage: false, bridge_kind: "NONE" },
      { label: "Con đẻ / Con nuôi / Con riêng", point: "d", tier: "mandatory", target_type: "INDIVIDUAL", requires_percentage: false, bridge_kind: "NONE" },
      { label: "Con dâu / Con rể", point: "d", tier: "mandatory", target_type: "INDIVIDUAL", requires_percentage: false, bridge_kind: "NONE" },
      { label: "Anh/chị/em ruột", point: "d", tier: "mandatory", target_type: "INDIVIDUAL", requires_percentage: false, bridge_kind: "NONE" },
      { label: "Anh/chị/em bên vợ/chồng", point: "d", tier: "mandatory", target_type: "INDIVIDUAL", requires_percentage: false, bridge_kind: "NONE" },
      { label: "Ông bà / Cháu ruột", point: "d", tier: "mandatory", target_type: "INDIVIDUAL", requires_percentage: false, bridge_kind: "NONE" },
      { label: "Bác / Cô / Dì / Chú / Cậu ruột", point: "d", tier: "mandatory", target_type: "INDIVIDUAL", requires_percentage: false, bridge_kind: "NONE" },
    ]
  },
  {
    group: "2. Sở hữu vốn & Quản lý Doanh nghiệp (Trực tiếp 0-Hop - Điểm c, b, e)",
    options: [
      { label: "Cổ đông sở hữu ≥5% vốn cổ phần biểu quyết (CTCP)", point: "c", tier: "mandatory", target_type: "ORGANIZATION", requires_percentage: true, target_pct_label: "% Vốn người vay sở hữu tại DN", bridge_kind: "NONE" },
      { label: "Thành viên góp vốn sở hữu ≥5% vốn điều lệ (TNHH)", point: "c", tier: "mandatory", target_type: "ORGANIZATION", requires_percentage: true, target_pct_label: "% Vốn người vay góp tại DN", bridge_kind: "NONE" },
      { label: "Chủ doanh nghiệp tư nhân / Thành viên hợp danh", point: "c", tier: "mandatory", target_type: "ORGANIZATION", requires_percentage: true, target_pct_label: "% Vốn sở hữu", bridge_kind: "NONE" },
      { label: "Chủ tịch / Thành viên HĐQT / HĐTV", point: "b", tier: "mandatory", target_type: "ORGANIZATION", requires_percentage: false, bridge_kind: "NONE" },
      { label: "Tổng Giám đốc / Giám đốc điều hành", point: "b", tier: "mandatory", target_type: "ORGANIZATION", requires_percentage: false, bridge_kind: "NONE" },
      { label: "Người đại diện theo ủy quyền phần vốn góp", point: "e", tier: "mandatory", target_type: "ORGANIZATION", requires_percentage: true, target_pct_label: "% Vốn được ủy quyền", bridge_kind: "NONE" },
    ]
  },
  {
    group: "3. Doanh nghiệp có Người thân làm Lãnh đạo/Cổ đông lớn (Bắc cầu - Điểm đ)",
    options: [
      { 
        label: "Doanh nghiệp do Người thân làm Lãnh đạo hoặc Cổ đông lớn ≥5%", 
        point: "đ", 
        tier: "mandatory", 
        target_type: "ORGANIZATION", 
        requires_percentage: true, 
        target_pct_label: "% Vốn người thân sở hữu tại DN đích (nếu có)",
        bridge_kind: "INDIV_RELATIVE_TO_CORP", 
        bridge_title: "Thông tin Người thân trung gian (cầu nối với DN đích)" 
      }
    ]
  }
];

// 2. TAXONOMY CHO KHÁCH HÀNG DOANH NGHIỆP
export const ENTERPRISE_RELATION_TAXONOMY: { group: string; options: RelationOptionMeta[] }[] = [
  {
    group: "1. Quan hệ Mẹ - Con Trực tiếp (Điểm a)",
    options: [
      { label: "Công ty mẹ", point: "a", tier: "mandatory", target_type: "ORGANIZATION", requires_percentage: true, target_pct_label: "% Vốn Mẹ sở hữu tại DN vay", bridge_kind: "NONE" },
      { label: "Công ty con", point: "a", tier: "mandatory", target_type: "ORGANIZATION", requires_percentage: true, target_pct_label: "% Vốn DN vay sở hữu tại Con", bridge_kind: "NONE" }
    ]
  },
  {
    group: "2. Ban Lãnh đạo & Cổ đông lớn Trực tiếp (Điểm b, c, e)",
    options: [
      { label: "Chủ tịch / Thành viên HĐQT", point: "b", tier: "mandatory", target_type: "INDIVIDUAL", requires_percentage: false, bridge_kind: "NONE" },
      { label: "Chủ tịch / Thành viên HĐTV", point: "b", tier: "mandatory", target_type: "INDIVIDUAL", requires_percentage: false, bridge_kind: "NONE" },
      { label: "Tổng Giám đốc / Giám đốc điều hành (CEO)", point: "b", tier: "mandatory", target_type: "INDIVIDUAL", requires_percentage: false, bridge_kind: "NONE" },
      { label: "Kiểm soát viên / Trưởng Ban kiểm soát", point: "b", tier: "mandatory", target_type: "INDIVIDUAL", requires_percentage: false, bridge_kind: "NONE" },
      { label: "Cá nhân sở hữu ≥5% vốn", point: "c", tier: "mandatory", target_type: "INDIVIDUAL", requires_percentage: true, target_pct_label: "% Vốn cá nhân sở hữu", bridge_kind: "NONE" },
      { label: "Tổ chức sở hữu ≥5% vốn", point: "c", tier: "mandatory", target_type: "ORGANIZATION", requires_percentage: true, target_pct_label: "% Vốn tổ chức sở hữu", bridge_kind: "NONE" },
      { label: "Người đại diện theo ủy quyền phần vốn", point: "e", tier: "mandatory", target_type: "INDIVIDUAL", requires_percentage: true, target_pct_label: "% Vốn đại diện", bridge_kind: "NONE" },
    ]
  },
  {
    group: "3. Quan hệ Tập đoàn Bắc cầu (Bắc cầu qua Company - Điểm a)",
    options: [
      { 
        label: "Công ty con của công ty con (Công ty cháu)", 
        point: "a", 
        tier: "mandatory", 
        target_type: "ORGANIZATION", 
        requires_percentage: true, 
        target_pct_label: "% F1 sở hữu tại Công ty cháu",
        bridge_kind: "CORP_F1_SUBSIDIARY", 
        bridge_title: "Công ty con trung gian (F1)" 
      },
      { 
        label: "Công ty con cùng công ty mẹ (Công ty chị em)", 
        point: "a", 
        tier: "mandatory", 
        target_type: "ORGANIZATION", 
        requires_percentage: true, 
        target_pct_label: "% Mẹ sở hữu tại Công ty chị em",
        bridge_kind: "CORP_COMMON_PARENT", 
        bridge_title: "Công ty mẹ chung" 
      },
      { 
        label: "Người quản lý / Kiểm soát viên của công ty mẹ", 
        point: "a", 
        tier: "mandatory", 
        target_type: "INDIVIDUAL", 
        requires_percentage: false, 
        bridge_kind: "CORP_PARENT_MANAGER_BRIDGE", 
        bridge_title: "Công ty mẹ" 
      }
    ]
  },
  {
    group: "4. Người thân của Lãnh đạo / Cổ đông lớn (Bắc cầu qua Person - Điểm đ)",
    options: [
      { 
        label: "Người thân (vợ/chồng/con/cha mẹ/anh em) của Lãnh đạo hoặc Cổ đông lớn", 
        point: "đ", 
        tier: "mandatory", 
        target_type: "INDIVIDUAL", 
        requires_percentage: false, 
        bridge_kind: "CORP_LEADER_FAMILY_BRIDGE", 
        bridge_title: "Lãnh đạo / Cổ đông lớn của DN vay (Cầu nối)" 
      }
    ]
  }
];
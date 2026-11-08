ADR-0002: RBAC matrix, Phase 0

Status: Approved
Roles

    owner — full control

    admin — manage members, workspaces, policies

    manager — manage assigned workspaces

    member — create/edit in accessible workspaces

    guest — reserved for Phase 2

Actions × resources
action	owner	admin	manager	member	guest
org:read	✔	✔	✔	✔	✘
org:update	✔	✔	✘	✘	✘
org:delete	✔	✘	✘	✘	✘
member:invite	✔	✔	✘	✘	✘
member:change_role	✔	✔¹	✘	✘	✘
workspace:create	✔	✔	✘²	✘	✘
audit_log:read	✔	✔	✘	✘	✘

¹ App-layer deny: admins cannot remove/change other admins or the owner. RLS allows this, but canModifyMember() in packages/auth enforces it.
² Flag allow_manager_workspace_creation exists but default is false.
App-layer deny (rules RLS does NOT enforce)

    admin modifying another admin's membership

    admin modifying the owner's membership

    admin deleting the organization

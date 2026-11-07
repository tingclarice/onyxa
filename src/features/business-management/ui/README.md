# Business management: ui

Own onboarding, business forms, menu/inbox, team settings, server queries and
Server Functions. Validate requests, resolve auth through auth's public server
entry, wire repositories to services, and handle cookies/navigation/revalidation.
Client components import only contracts and dedicated action modules. The public
server.ts entry exposes authorized business context to other features; app route
composition can render this feature's delivery components directly.

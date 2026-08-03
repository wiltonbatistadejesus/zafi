const DESTINATION = new URL('https://meuzafi.com.br/')

DESTINATION.searchParams.set('utm_source', 'facebook')
DESTINATION.searchParams.set('utm_medium', 'organic_social')
DESTINATION.searchParams.set('utm_campaign', 'divulgacao_comunidades')
DESTINATION.searchParams.set('utm_content', 'grupo_768525166538412')

export function GET() {
  return Response.redirect(DESTINATION, 302)
}


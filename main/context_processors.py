"""
Context processors для TaskForge
"""

def user_tech_admin(request):
    """Добавляет информацию о том, является ли пользователь техадмином"""
    is_tech_admin = False
    
    if request.user.is_authenticated:
        try:
            is_tech_admin = hasattr(request.user, 'tech_admin') and request.user.tech_admin.is_active
        except:
            is_tech_admin = False
    
    return {
        'is_tech_admin': is_tech_admin
    }

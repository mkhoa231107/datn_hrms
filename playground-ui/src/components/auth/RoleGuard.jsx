import React from 'react';

// RoleGuard ensures that the enclosed components are only accessible 
// by users possessing at least one of the allowed roles.
export const RoleGuard = ({ user, allowedRoles, customCheck = false, children, fallback = null }) => {
    if (!user || !user.roles || !Array.isArray(user.roles)) {
        return fallback;
    }

    // Access if user has any of the allowed roles OR the custom check passes
    const hasRoleAccess = user.roles.some((role) => allowedRoles.includes(role));
    const hasAccess = hasRoleAccess || customCheck;

    if (!hasAccess) {
        return fallback;
    }

    return <>{children}</>;
};

// Example HOC usage (Higher Order Component)
export const withRoleGuard = (WrappedComponent, allowedRoles) => {
    return (props) => (
        <RoleGuard user={props.user} allowedRoles={allowedRoles}>
            <WrappedComponent {...props} />
        </RoleGuard>
    );
};

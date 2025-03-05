import styled from 'styled-components';
import theme from '../../styles/theme';

export const ReelsContainer = styled.section`
  background: linear-gradient(to bottom, ${theme.colors.neutral.white}, ${theme.colors.neutral.lightGrey});
  border-radius: ${theme.borderRadius.lg};
  overflow: hidden;
  box-shadow: ${theme.shadows.sm};
`;

export const ReelsHeader = styled.header`
  padding: ${theme.spacing.lg} ${theme.spacing.xl};
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid ${theme.colors.neutral.grey};
`;

export const ReelsTitle = styled.h2`
  font-family: ${theme.typography.fontFamily.heading};
  font-weight: ${theme.typography.fontWeight.semibold};
  font-size: ${theme.typography.fontSize['2xl']};
  color: ${theme.colors.neutral.black};
  margin: 0;
`;

export const ReelsSubtitle = styled.p`
  font-family: ${theme.typography.fontFamily.main};
  font-size: ${theme.typography.fontSize.base};
  color: ${theme.colors.neutral.darkGrey};
  margin: ${theme.spacing.xs} 0 0 0;
`;

export const ReelsContent = styled.div`
  padding: ${theme.spacing.lg};
`;

export const ReelsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: ${theme.spacing.lg};
  
  @media (min-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (min-width: 1024px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

export const ActionBar = styled.div`
  display: flex;
  justify-content: flex-end;
  padding: ${theme.spacing.md} 0;
`;

export const Button = styled.button`
  background-color: ${props => props.variant === 'primary' ? theme.colors.primary.main : theme.colors.neutral.white};
  color: ${props => props.variant === 'primary' ? theme.colors.primary.contrast : theme.colors.neutral.darkGrey};
  border: 1px solid ${props => props.variant === 'primary' ? 'transparent' : theme.colors.neutral.grey};
  border-radius: ${theme.borderRadius.md};
  font-family: ${theme.typography.fontFamily.main};
  font-weight: ${theme.typography.fontWeight.medium};
  font-size: ${theme.typography.fontSize.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: ${theme.transitions.default};
  
  &:hover {
    background-color: ${props => props.variant === 'primary' ? theme.colors.primary.dark : theme.colors.neutral.lightGrey};
  }
  
  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px ${theme.colors.primary.light};
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  & > svg {
    margin-right: ${theme.spacing.xs};
  }
`;

export const FacebookButton = styled(Button)`
  background-color: ${theme.colors.social.facebook};
  color: ${theme.colors.neutral.white};
  
  &:hover {
    background-color: #0d65d9;
  }
`;

export const EmptyState = styled.div`
  text-align: center;
  padding: ${theme.spacing.xl};
  background-color: ${theme.colors.neutral.white};
  border-radius: ${theme.borderRadius.lg};
  box-shadow: ${theme.shadows.sm};
`;

export const EmptyStateTitle = styled.p`
  font-family: ${theme.typography.fontFamily.main};
  font-weight: ${theme.typography.fontWeight.medium};
  font-size: ${theme.typography.fontSize.lg};
  color: ${theme.colors.neutral.black};
  margin-bottom: ${theme.spacing.md};
`;

export const EmptyStateText = styled.p`
  font-family: ${theme.typography.fontFamily.main};
  font-size: ${theme.typography.fontSize.base};
  color: ${theme.colors.neutral.darkGrey};
  margin: 0;
`;

export const ErrorContainer = styled.div`
  text-align: center;
  padding: ${theme.spacing.lg};
  background-color: #FEF2F2;
  border-radius: ${theme.borderRadius.lg};
  border: 1px solid ${theme.colors.feedback.error};
  color: ${theme.colors.feedback.error};
  margin: ${theme.spacing.lg} 0;
`;

export const ErrorTitle = styled.p`
  font-family: ${theme.typography.fontFamily.main};
  font-weight: ${theme.typography.fontWeight.medium};
  font-size: ${theme.typography.fontSize.lg};
  margin-bottom: ${theme.spacing.sm};
`;

export const ErrorActions = styled.div`
  display: flex;
  justify-content: center;
  gap: ${theme.spacing.md};
  margin-top: ${theme.spacing.lg};
`;

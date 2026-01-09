import { useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { motion } from 'framer-motion';

const LandingPage = () => {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  return (
    <PageContainer>
      {/* Header */}
      <Header>
        <Logo>
          <LogoIcon>P</LogoIcon>
          <LogoText>PoTrades</LogoText>
        </Logo>
        <Nav>
          <NavLink href="#features">Features</NavLink>
          <NavLink href="#trading">Trading</NavLink>
          <NavLink href="#about">About Us</NavLink>
          <NavLink href="#help">Help</NavLink>
        </Nav>
        <HeaderActions>
          <LoginButton onClick={() => setIsLoginModalOpen(true)}>Log In</LoginButton>
          <SignUpButton as={Link} to="/register">Sign Up</SignUpButton>
        </HeaderActions>
      </Header>

      {/* Hero Section */}
      <HeroSection>
        <HeroContent>
          <HeroTitle>
            THE RIGHT PLACE FOR ONLINE TRADING
            <br />
            <GradientText>ON FINANCIAL MARKETS</GradientText>
          </HeroTitle>
          <HeroSubtitle>
            The most user-friendly interface
            <br />
            Get access to trade over 100+ global trading assets
          </HeroSubtitle>
          <HeroActions>
            <CTAButton as={Link} to="/register">START TRADING NOW</CTAButton>
            <DemoButton as={Link} to="/demo">Try Free Demo</DemoButton>
          </HeroActions>
          <HeroStats>
            <Stat>
              <StatValue>$5*</StatValue>
              <StatLabel>Minimum investment</StatLabel>
            </Stat>
            <Stat>
              <StatValue>$1</StatValue>
              <StatLabel>Minimum trade amount</StatLabel>
            </Stat>
            <Stat>
              <StatValue>$50,000</StatValue>
              <StatLabel>Virtual money on Demo</StatLabel>
            </Stat>
            <Stat>
              <StatValue>50+</StatValue>
              <StatLabel>Payment methods</StatLabel>
            </Stat>
          </HeroStats>
        </HeroContent>
        <HeroImage>
          <TradingPreview>
            {/* Trading interface preview */}
            <ChartPreview />
          </TradingPreview>
        </HeroImage>
      </HeroSection>

      {/* Features Section */}
      <FeaturesSection id="features">
        <SectionTitle>Why choose us?</SectionTitle>
        <FeaturesGrid>
          <FeatureCard>
            <FeatureIcon>📈</FeatureIcon>
            <FeatureTitle>FLEXIBLE TRADING</FeatureTitle>
            <FeatureDescription>
              Latest trends: quick and digital trading, express trades, pending trades, copy trading.
              Payouts of up to 218%.
            </FeatureDescription>
          </FeatureCard>

          <FeatureCard>
            <FeatureIcon>🎓</FeatureIcon>
            <FeatureTitle>COMPREHENSIVE EDUCATION</FeatureTitle>
            <FeatureDescription>
              Our help section contains tutorials, guides and various trading strategies.
            </FeatureDescription>
          </FeatureCard>

          <FeatureCard>
            <FeatureIcon>💹</FeatureIcon>
            <FeatureTitle>DIVERSE TRADING INSTRUMENTS</FeatureTitle>
            <FeatureDescription>
              Assets suitable for any trader: currency, commodities, stocks, cryptocurrencies.
            </FeatureDescription>
          </FeatureCard>

          <FeatureCard>
            <FeatureIcon>🎮</FeatureIcon>
            <FeatureTitle>DEMO ACCOUNT</FeatureTitle>
            <FeatureDescription>
              Try all platform benefits on the Demo account using virtual money.
              No investment needed, no risks involved.
            </FeatureDescription>
          </FeatureCard>

          <FeatureCard>
            <FeatureIcon>💳</FeatureIcon>
            <FeatureTitle>EASY DEPOSITS AND WITHDRAWALS</FeatureTitle>
            <FeatureDescription>
              Use the most convenient payment method for hassle-free deposits and withdrawals.
            </FeatureDescription>
          </FeatureCard>

          <FeatureCard>
            <FeatureIcon>⭐</FeatureIcon>
            <FeatureTitle>HIGH CUSTOMER LOYALTY</FeatureTitle>
            <FeatureDescription>
              Trading tournaments, regular bonuses, gifts, promo codes and contests are available.
            </FeatureDescription>
          </FeatureCard>

          <FeatureCard>
            <FeatureIcon>🎁</FeatureIcon>
            <FeatureTitle>TRADING ADVANTAGES</FeatureTitle>
            <FeatureDescription>
              Use cashback and other advantages for a more comfortable trading experience with minimal risks.
            </FeatureDescription>
          </FeatureCard>

          <FeatureCard>
            <FeatureIcon>📊</FeatureIcon>
            <FeatureTitle>INDICATORS AND SIGNALS</FeatureTitle>
            <FeatureDescription>
              Everything you need for a top-tier trading experience including popular indicators and signals.
            </FeatureDescription>
          </FeatureCard>
        </FeaturesGrid>
      </FeaturesSection>

      {/* Trading Conditions Section */}
      <TradingSection id="trading">
        <SectionTitle>Place your trades on best conditions</SectionTitle>
        <TradingGrid>
          <TradingCard>
            <TradingValue>$5*</TradingValue>
            <TradingLabel>Minimum investment amount</TradingLabel>
          </TradingCard>
          <TradingCard>
            <TradingValue>$1</TradingValue>
            <TradingLabel>Minimum trade amount</TradingLabel>
          </TradingCard>
          <TradingCard>
            <TradingValue>$50,000</TradingValue>
            <TradingLabel>Virtual money on Demo account</TradingLabel>
          </TradingCard>
          <TradingCard>
            <TradingValue>50+</TradingValue>
            <TradingLabel>Payment methods</TradingLabel>
          </TradingCard>
          <TradingCard>
            <TradingValue>$0</TradingValue>
            <TradingLabel>No commission on deposit</TradingLabel>
          </TradingCard>
          <TradingCard>
            <TradingValue>100+</TradingValue>
            <TradingLabel>Assets for trading</TradingLabel>
          </TradingCard>
        </TradingGrid>
      </TradingSection>

      {/* Assets Section */}
      <AssetsSection>
        <SectionTitle>Trade 100+ assets</SectionTitle>
        <AssetCategories>
          <AssetCategory>
            <CategoryIcon>💱</CategoryIcon>
            <CategoryName>Forex</CategoryName>
            <CategoryCount>30+ pairs</CategoryCount>
          </AssetCategory>
          <AssetCategory>
            <CategoryIcon>₿</CategoryIcon>
            <CategoryName>Crypto</CategoryName>
            <CategoryCount>25+ coins</CategoryCount>
          </AssetCategory>
          <AssetCategory>
            <CategoryIcon>📈</CategoryIcon>
            <CategoryName>Stocks</CategoryName>
            <CategoryCount>20+ stocks</CategoryCount>
          </AssetCategory>
          <AssetCategory>
            <CategoryIcon>🛢️</CategoryIcon>
            <CategoryName>Commodities</CategoryName>
            <CategoryCount>15+ assets</CategoryCount>
          </AssetCategory>
        </AssetCategories>
      </AssetsSection>

      {/* How It Works Section */}
      <HowItWorksSection>
        <SectionTitle>Start trading in 3 easy steps</SectionTitle>
        <StepsGrid>
          <Step>
            <StepNumber>1</StepNumber>
            <StepTitle>Register Account</StepTitle>
            <StepDescription>
              Sign up in less than 30 seconds with your email and create a strong password.
            </StepDescription>
          </Step>
          <Step>
            <StepNumber>2</StepNumber>
            <StepTitle>Make a Deposit</StepTitle>
            <StepDescription>
              Choose from 50+ payment methods including crypto, cards, and e-wallets.
            </StepDescription>
          </Step>
          <Step>
            <StepNumber>3</StepNumber>
            <StepTitle>Start Trading</StepTitle>
            <StepDescription>
              Select an asset, choose UP or DOWN, set the amount and expiry time, then trade!
            </StepDescription>
          </Step>
        </StepsGrid>
      </HowItWorksSection>

      {/* CTA Section */}
      <CTASection>
        <CTAContent>
          <CTATitle>Ready to start trading?</CTATitle>
          <CTASubtitle>Join thousands of traders already making profits on PoTrades</CTASubtitle>
          <CTAButton as={Link} to="/register">Create Free Account</CTAButton>
        </CTAContent>
      </CTASection>

      {/* Footer */}
      <Footer>
        <FooterContent>
          <FooterSection>
            <FooterTitle>PoTrades</FooterTitle>
            <FooterText>
              The most advanced binary options trading platform with cutting-edge technology
              and user-friendly interface.
            </FooterText>
          </FooterSection>
          <FooterSection>
            <FooterTitle>Trading</FooterTitle>
            <FooterLink href="/trading">Quick Start</FooterLink>
            <FooterLink href="/demo">Free Demo</FooterLink>
            <FooterLink href="/assets">Trading Assets</FooterLink>
            <FooterLink href="/tutorials">Trading Tutorials</FooterLink>
          </FooterSection>
          <FooterSection>
            <FooterTitle>Company</FooterTitle>
            <FooterLink href="/about">About Us</FooterLink>
            <FooterLink href="/blog">Blog</FooterLink>
            <FooterLink href="/careers">Careers</FooterLink>
            <FooterLink href="/contact">Contact</FooterLink>
          </FooterSection>
          <FooterSection>
            <FooterTitle>Support</FooterTitle>
            <FooterLink href="/help">Help Center</FooterLink>
            <FooterLink href="/faq">FAQ</FooterLink>
            <FooterLink href="/support">Support Tickets</FooterLink>
            <FooterLink href="/terms">Terms & Conditions</FooterLink>
          </FooterSection>
        </FooterContent>
        <FooterBottom>
          <Copyright>© 2026 PoTrades. All rights reserved.</Copyright>
          <SocialLinks>
            <SocialLink href="#">Twitter</SocialLink>
            <SocialLink href="#">Facebook</SocialLink>
            <SocialLink href="#">Instagram</SocialLink>
            <SocialLink href="#">Telegram</SocialLink>
          </SocialLinks>
        </FooterBottom>
      </Footer>
    </PageContainer>
  );
};

// Styled Components
const PageContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #0a0e27 0%, #1a1d3a 100%);
  color: #fff;
`;

const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem 5%;
  background: rgba(10, 14, 39, 0.95);
  backdrop-filter: blur(10px);
  position: sticky;
  top: 0;
  z-index: 1000;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const LogoIcon = styled.div`
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 24px;
`;

const LogoText = styled.span`
  font-size: 24px;
  font-weight: bold;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const Nav = styled.nav`
  display: flex;
  gap: 2rem;

  @media (max-width: 768px) {
    display: none;
  }
`;

const NavLink = styled.a`
  color: #fff;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.3s;

  &:hover {
    color: #667eea;
  }
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 1rem;
`;

const LoginButton = styled.button`
  padding: 0.75rem 1.5rem;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: #667eea;
  }
`;

const SignUpButton = styled(motion.button)`
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.3s;
  text-decoration: none;
  display: inline-block;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
  }
`;

const HeroSection = styled.section`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  padding: 6rem 5%;
  align-items: center;

  @media (max-width: 968px) {
    grid-template-columns: 1fr;
    text-align: center;
  }
`;

const HeroContent = styled.div`
  max-width: 600px;
`;

const HeroTitle = styled.h1`
  font-size: 3.5rem;
  font-weight: 800;
  line-height: 1.2;
  margin-bottom: 1.5rem;

  @media (max-width: 768px) {
    font-size: 2.5rem;
  }
`;

const GradientText = styled.span`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const HeroSubtitle = styled.p`
  font-size: 1.25rem;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 2rem;
  line-height: 1.6;
`;

const HeroActions = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 3rem;

  @media (max-width: 968px) {
    justify-content: center;
  }
`;

const CTAButton = styled(motion.button)`
  padding: 1rem 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 10px;
  color: #fff;
  font-weight: 700;
  font-size: 1.1rem;
  cursor: pointer;
  text-decoration: none;
  display: inline-block;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 15px 40px rgba(102, 126, 234, 0.5);
  }
`;

const DemoButton = styled(motion.button)`
  padding: 1rem 2rem;
  background: transparent;
  border: 2px solid #667eea;
  border-radius: 10px;
  color: #fff;
  font-weight: 700;
  font-size: 1.1rem;
  cursor: pointer;
  text-decoration: none;
  display: inline-block;

  &:hover {
    background: rgba(102, 126, 234, 0.1);
  }
`;

const HeroStats = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2rem;

  @media (max-width: 968px) {
    justify-items: center;
  }
`;

const Stat = styled.div`
  text-align: left;

  @media (max-width: 968px) {
    text-align: center;
  }
`;

const StatValue = styled.div`
  font-size: 2.5rem;
  font-weight: 800;
  color: #667eea;
  margin-bottom: 0.5rem;
`;

const StatLabel = styled.div`
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.6);
`;

const HeroImage = styled.div`
  position: relative;
`;

const TradingPreview = styled.div`
  background: rgba(26, 29, 58, 0.8);
  border-radius: 20px;
  padding: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
`;

const ChartPreview = styled.div`
  width: 100%;
  height: 400px;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  border-radius: 10px;
`;

const FeaturesSection = styled.section`
  padding: 6rem 5%;
  background: rgba(10, 14, 39, 0.5);
`;

const SectionTitle = styled.h2`
  font-size: 3rem;
  font-weight: 800;
  text-align: center;
  margin-bottom: 4rem;
  background: linear-gradient(135deg, #fff 0%, rgba(255, 255, 255, 0.7) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const FeaturesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem;
`;

const FeatureCard = styled(motion.div)`
  background: rgba(26, 29, 58, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  padding: 2rem;
  transition: transform 0.3s, box-shadow 0.3s;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
    border-color: #667eea;
  }
`;

const FeatureIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 1rem;
`;

const FeatureTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 1rem;
  color: #667eea;
`;

const FeatureDescription = styled.p`
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.6;
`;

const TradingSection = styled.section`
  padding: 6rem 5%;
`;

const TradingGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
`;

const TradingCard = styled.div`
  text-align: center;
  padding: 2rem;
  background: rgba(26, 29, 58, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 15px;
`;

const TradingValue = styled.div`
  font-size: 3rem;
  font-weight: 800;
  color: #667eea;
  margin-bottom: 1rem;
`;

const TradingLabel = styled.div`
  color: rgba(255, 255, 255, 0.7);
`;

const AssetsSection = styled.section`
  padding: 6rem 5%;
  background: rgba(10, 14, 39, 0.5);
`;

const AssetCategories = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 2rem;
`;

const AssetCategory = styled.div`
  text-align: center;
  padding: 3rem 2rem;
  background: rgba(26, 29, 58, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  transition: transform 0.3s;

  &:hover {
    transform: scale(1.05);
    border-color: #667eea;
  }
`;

const CategoryIcon = styled.div`
  font-size: 4rem;
  margin-bottom: 1rem;
`;

const CategoryName = styled.h3`
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
`;

const CategoryCount = styled.div`
  color: rgba(255, 255, 255, 0.6);
`;

const HowItWorksSection = styled.section`
  padding: 6rem 5%;
`;

const StepsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 3rem;
`;

const Step = styled.div`
  text-align: center;
  padding: 2rem;
`;

const StepNumber = styled.div`
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  font-weight: 800;
  margin: 0 auto 1.5rem;
`;

const StepTitle = styled.h3`
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
`;

const StepDescription = styled.p`
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.6;
`;

const CTASection = styled.section`
  padding: 6rem 5%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  text-align: center;
`;

const CTAContent = styled.div`
  max-width: 800px;
  margin: 0 auto;
`;

const CTATitle = styled.h2`
  font-size: 3rem;
  font-weight: 800;
  margin-bottom: 1rem;
`;

const CTASubtitle = styled.p`
  font-size: 1.25rem;
  margin-bottom: 2rem;
  opacity: 0.9;
`;

const Footer = styled.footer`
  background: rgba(10, 14, 39, 0.95);
  padding: 4rem 5% 2rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const FooterContent = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 3rem;
  margin-bottom: 3rem;
`;

const FooterSection = styled.div``;

const FooterTitle = styled.h4`
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  color: #667eea;
`;

const FooterText = styled.p`
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.6;
`;

const FooterLink = styled.a`
  display: block;
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  margin-bottom: 0.75rem;
  transition: color 0.3s;

  &:hover {
    color: #667eea;
  }
`;

const FooterBottom = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 2rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }
`;

const Copyright = styled.div`
  color: rgba(255, 255, 255, 0.5);
`;

const SocialLinks = styled.div`
  display: flex;
  gap: 1.5rem;
`;

const SocialLink = styled.a`
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  transition: color 0.3s;

  &:hover {
    color: #667eea;
  }
`;

export default LandingPage;

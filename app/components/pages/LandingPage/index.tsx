import Container from "../../shared/Container";
import BrandMarquee from "./BrandMarquee";
import Hero from "./Hero";

const LandingPageComponent = () => {
  return (
    <Container>
      <Hero />
      <BrandMarquee />
    </Container>
  );
};

export default LandingPageComponent;

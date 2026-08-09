using FluentValidation;
using SportConnect.Core.DTOs.Profile;

namespace SportConnect.API.Validators
{
    public class UpdateProfileValidator : AbstractValidator<UpdateProfileDto>
    {
        public UpdateProfileValidator()
        {
            RuleFor(x => x.RadiusMeters)
                .InclusiveBetween(500, 20000)
                .WithMessage("Радиус должен быть от 500 до 20 000 метров");

            RuleFor(x => x.SkillLevel)
                .IsInEnum()
                .WithMessage("Недопустимый уровень подготовки");

            
        }
    }
}
